import type { PaletteColor } from '#lib/color.ts';

export type Loaded = {
	source: CanvasImageSource;
	width: number;
	height: number;
	close: () => void;
};

const ALPHA_CUTOFF = 128;

export async function loadImage(file: File): Promise<Loaded> {
	if (typeof createImageBitmap === 'function') {
		try {
			const bitmap = await createImageBitmap(file);
			return {
				source: bitmap,
				width: bitmap.width,
				height: bitmap.height,
				close: () => bitmap.close()
			};
		} catch {
			// falls back to a plain image element below
		}
	}

	const url = URL.createObjectURL(file);

	try {
		const image = new Image();
		image.src = url;
		await image.decode();

		return {
			source: image,
			width: image.naturalWidth,
			height: image.naturalHeight,
			close: () => URL.revokeObjectURL(url)
		};
	} catch (error) {
		URL.revokeObjectURL(url);
		throw error;
	}
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) throw new Error('Canvas 2D context is not available');
	return context;
}

export function readPixels(image: Loaded): ImageData {
	const context = context2d(createCanvas(image.width, image.height));
	context.drawImage(image.source, 0, 0);
	return context.getImageData(0, 0, image.width, image.height);
}

export function toBlobUrl(canvas: HTMLCanvasElement): Promise<string> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (!blob) {
				reject(new Error('Could not encode the image'));
				return;
			}
			resolve(URL.createObjectURL(blob));
		}, 'image/png');
	});
}

export function extractColors(image: HTMLImageElement, maxColors = 64): PaletteColor[] {
	const canvas = createCanvas(image.naturalWidth, image.naturalHeight);
	const context = context2d(canvas);

	context.drawImage(image, 0, 0);

	const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
	const counts = new Map<number, number>();

	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3] < ALPHA_CUTOFF) continue;

		const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, maxColors)
		.map(([key]) => ({
			r: (key >> 16) & 0xff,
			g: (key >> 8) & 0xff,
			b: key & 0xff,
			active: true
		}));
}
