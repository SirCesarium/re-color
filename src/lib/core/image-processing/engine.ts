import { createColorLookup } from './color/mapping/registry.ts';
import { rgbToKey } from './color/metrics.ts';
import { validateRecolorConfig } from './config-schema.ts';
import {
	context2d,
	createCanvas,
	loadImage,
	readPixels,
	toBlobUrl
} from './image/canvas.ts';
import { validateImageFile } from './image/validation.ts';
import type { PaletteColor, RecolorConfig, Rgb } from './types.ts';

/**
 * Recolors a sprite with an explicit palette and processing configuration.
 *
 * Decodes the file, counts the source colors, asks the selected mapping strategy
 * for target colors, repaints the pixels in time-bounded chunks, and encodes the
 * result in the requested format. Pixels below `transparency.minAlpha` and the
 * ones in `excludedPixels` are left alone; original alpha survives when
 * `config.transparency.preserveAlpha` is on.
 *
 * Progress fires the configured milestones plus intermediate fractions between
 * `pixelsRead` and `processingComplete`. Cancellation is honored between stages,
 * between chunks, and once more after encoding.
 *
 * @param file Sprite image file to recolor.
 * @param palette Palette whose active colors are offered to the mapping strategy.
 * @param config Every setting the engine needs; nothing is inferred or defaulted here.
 * @returns An object URL for the encoded image, or `null` when there is nothing
 * to produce: no active colors, no eligible pixels, an empty mapping, or a
 * cancellation request.
 * @throws {RangeError} If a numeric setting is outside its supported range.
 * @throws If image decoding, canvas access, the mapping strategy, or encoding fails.
 * @see {@link RecolorConfig}
 * @see {@link ColorMappingStrategy}
 */
export async function recolorSprite(
	file: File,
	palette: readonly PaletteColor[],
	config: RecolorConfig
): Promise<string | null> {
	validateRecolorConfig(config);
	await validateImageFile(file);

	if (!palette.some(color => color.active)) return null;

	const { onProgress, isCancelled, chunkDurationMs, progress, yieldToMain } =
		config.processing;

	onProgress(progress.start);

	const image = await loadImage(file);

	try {
		if (isCancelled()) return null;

		onProgress(progress.imageLoaded);

		const imageData = readPixels(image, config.canvas);
		const { data, width, height } = imageData;

		if (width === 0 || height === 0) return null;
		validateExcludedPixels(config.excludedPixels, width * height);

		onProgress(progress.pixelsRead);

		if (isCancelled()) return null;

		const counts = await countColors(
			data,
			config.transparency.minAlpha,
			chunkDurationMs,
			yieldToMain,
			isCancelled
		);
		if (!counts || isCancelled()) return null;

		const activePalette = palette.filter(color => color.active);

		const lookup = await createColorLookup(
			{
				keys: [...counts.keys()],
				palette: activePalette.map(({ r, g, b }) => ({ r, g, b })),
				counts,
				config: {
					mode: config.mapping.mode,
					distanceWeights: config.mapping.distanceWeights,
					luminanceWeights: config.mapping.luminanceWeights,
					fallback: config.mapping.fallback
				},
				isCancelled
			},
			config.mapping
		);

		if (lookup.size === 0) return null;
		if (isCancelled()) return null;

		const canvas = createCanvas(width, height);
		const context = context2d(canvas, config.canvas);

		let row = 0;

		while (row < height) {
			const start = performance.now();

			while (row < height && performance.now() - start < chunkDurationMs) {
				applyRow(
					data,
					row,
					width,
					lookup,
					config.transparency,
					config.excludedPixels
				);
				row++;
			}

			onProgress(
				progress.pixelsRead +
					((progress.processingComplete - progress.pixelsRead) * row) / height
			);

			if (isCancelled()) return null;

			if (row < height) await yieldToMain();
		}

		context.putImageData(imageData, 0, 0);

		onProgress(progress.processingComplete);

		const url = await toBlobUrl(canvas, config.output);

		onProgress(progress.complete);

		if (isCancelled()) {
			URL.revokeObjectURL(url);

			return null;
		}

		return url;
	} finally {
		image.close();
	}
}

/** Tallies the source colors, giving the main thread a break every so often. */
async function countColors(
	data: Uint8ClampedArray,
	minAlpha: number,
	chunkDurationMs: number,
	yieldToMain: () => Promise<void>,
	isCancelled: () => boolean
): Promise<Map<number, number> | null> {
	const counts = new Map<number, number>();
	let index = 0;

	while (index < data.length) {
		const start = performance.now();

		while (index < data.length && performance.now() - start < chunkDurationMs) {
			if (data[index + 3] >= minAlpha) {
				const key = rgbToKey({
					r: data[index],
					g: data[index + 1],
					b: data[index + 2]
				});
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}

			index += 4;
		}

		if (isCancelled()) return null;
		if (index < data.length) await yieldToMain();
	}

	return counts;
}

/** Repaints one row in place, forcing alpha to opaque unless we are preserving it. */
function applyRow(
	data: Uint8ClampedArray,
	row: number,
	width: number,
	lookup: ReadonlyMap<number, Rgb>,
	transparency: RecolorConfig['transparency'],
	excludedPixels?: ReadonlySet<number>
): void {
	let index = row * width * 4;
	const end = index + width * 4;

	for (; index < end; index += 4) {
		if (excludedPixels?.has(index / 4)) continue;
		if (data[index + 3] < transparency.minAlpha) continue;

		const key = rgbToKey({
			r: data[index],
			g: data[index + 1],
			b: data[index + 2]
		});
		const target = lookup.get(key);

		if (!target) continue;

		data[index] = target.r;
		data[index + 1] = target.g;
		data[index + 2] = target.b;

		if (!transparency.preserveAlpha) data[index + 3] = transparency.opaqueAlpha;
	}
}

/** Throws when the exclusion mask names a pixel that does not exist. */
function validateExcludedPixels(
	excludedPixels: ReadonlySet<number> | undefined,
	pixelCount: number
): void {
	if (!excludedPixels) return;

	for (const index of excludedPixels) {
		if (!Number.isInteger(index) || index < 0 || index >= pixelCount) {
			throw new RangeError(
				`excludedPixels contains an invalid pixel index: ${index}`
			);
		}
	}
}
