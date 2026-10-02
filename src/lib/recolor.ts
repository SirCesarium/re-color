import { buildLut, type MappingMode, type PaletteColor } from '#lib/color.ts';
import { createCanvas, context2d, loadImage, readPixels, toBlobUrl } from '#lib/canvas.ts';

const CHUNK_MS = 6;
const PROGRESS_READ = 0.1;
const PROGRESS_WRITE = 0.9;

function yieldToMain(): Promise<void> {
	const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
	if (scheduler?.yield) return scheduler.yield();

	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

function applyRow(
	data: Uint8ClampedArray,
	row: number,
	width: number,
	lut: Map<number, PaletteColor>
): void {
	let index = row * width * 4;
	const end = index + width * 4;

	for (; index < end; index += 4) {
		if (data[index + 3] === 0) continue;

		const key = (data[index] << 16) | (data[index + 1] << 8) | data[index + 2];
		const target = lut.get(key);
		if (!target) continue;

		data[index] = target.r;
		data[index + 1] = target.g;
		data[index + 2] = target.b;
	}
}

export async function recolor(
	file: File,
	colors: PaletteColor[],
	mode: MappingMode,
	onProgress: (fraction: number) => void = () => {},
	isCancelled: () => boolean = () => false
): Promise<string | null> {
	if (!colors.some((color) => color.active)) return null;

	onProgress(0);
	const image = await loadImage(file);

	try {
		if (isCancelled()) return null;
		onProgress(0.05);

		const imageData = readPixels(image);
		const { data, width, height } = imageData;
		if (width === 0 || height === 0) return null;

		onProgress(PROGRESS_READ);
		if (isCancelled()) return null;

		const counts = new Map<number, number>();
		for (let i = 0; i < data.length; i += 4) {
			if (data[i + 3] === 0) continue;

			const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}

		const lut = buildLut([...counts.keys()], colors, mode, counts);
		if (lut.size === 0) return null;

		const canvas = createCanvas(width, height);
		const context = context2d(canvas);
		let row = 0;

		while (row < height) {
			const start = performance.now();

			while (row < height && performance.now() - start < CHUNK_MS) {
				applyRow(data, row, width, lut);
				row++;
			}

			onProgress(PROGRESS_READ + ((PROGRESS_WRITE - PROGRESS_READ) * row) / height);
			if (isCancelled()) return null;
			if (row < height) await yieldToMain();
		}

		context.putImageData(imageData, 0, 0);
		onProgress(PROGRESS_WRITE);

		const url = await toBlobUrl(canvas);
		onProgress(1);

		if (isCancelled()) {
			URL.revokeObjectURL(url);
			return null;
		}

		return url;
	} finally {
		image.close();
	}
}
