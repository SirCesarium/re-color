import { createColorLookup } from './color/mapping/registry.ts';
import { rgbToKey } from './color/metrics.ts';
import { context2d, createCanvas, loadImage, readPixels, toBlobUrl } from './image/canvas.ts';
import type { PaletteColor, RecolorConfig, Rgb } from './types.ts';

/**
 * Recolors a sprite with an explicit palette and processing configuration.
 *
 * The operation decodes the file, counts eligible source colors, asks the selected
 * mapping strategy for target colors, processes pixels in time-bounded chunks, and
 * encodes the result in the requested format. Original alpha values are preserved
 * when `config.transparency.preserveAlpha` is true.
 *
 * Progress callbacks receive the configured milestones and intermediate fractions
 * between `pixelsRead` and `processingComplete`. Cancellation is checked between
 * stages, chunks, and after encoding.
 *
 * @param file Sprite image file to recolor.
 * @param palette Palette whose active colors are available to the mapping strategy.
 * @param config Complete mapping, transparency, scheduling, progress, cancellation,
 * canvas, and output settings. No processing options are inferred by this function.
 * @returns An object URL for the encoded image, or `null` when there are no active
 * colors, no eligible pixels, no mappings, or cancellation is requested.
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
	validateConfig(config);

	if (!palette.some((color) => color.active)) return null;

	const { onProgress, isCancelled, chunkDurationMs, progress, yieldToMain } = config.processing;

	onProgress(progress.start);

	const image = await loadImage(file);

	try {
		if (isCancelled()) return null;

		onProgress(progress.imageLoaded);

		const imageData = readPixels(image, config.canvas);
		const { data, width, height } = imageData;

		if (width === 0 || height === 0) return null;

		onProgress(progress.pixelsRead);

		if (isCancelled()) return null;

		const counts = countColors(data, config.transparency.minAlpha);
		const activePalette = palette.filter((color) => color.active);

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
				applyRow(data, row, width, lookup, config.transparency);
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

/** Counts non-transparent source pixels by packed RGB key. */
function countColors(data: Uint8ClampedArray, minAlpha: number): Map<number, number> {
	const counts = new Map<number, number>();

	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] < minAlpha) continue;

		const key = rgbToKey({ r: data[index], g: data[index + 1], b: data[index + 2] });

		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return counts;
}

/** Replaces eligible pixel RGB values in one row, optionally normalizing alpha. */
function applyRow(
	data: Uint8ClampedArray,
	row: number,
	width: number,
	lookup: ReadonlyMap<number, Rgb>,
	transparency: RecolorConfig['transparency']
): void {
	let index = row * width * 4;
	const end = index + width * 4;

	for (; index < end; index += 4) {
		if (data[index + 3] < transparency.minAlpha) continue;

		const key = rgbToKey({ r: data[index], g: data[index + 1], b: data[index + 2] });
		const target = lookup.get(key);

		if (!target) continue;

		data[index] = target.r;
		data[index + 1] = target.g;
		data[index + 2] = target.b;

		if (!transparency.preserveAlpha) data[index + 3] = transparency.opaqueAlpha;
	}
}

/** Rejects invalid runtime values before image processing begins. */
function validateConfig(config: RecolorConfig): void {
	const { processing, transparency, mapping, output } = config;

	validateByte('transparency.minAlpha', transparency.minAlpha);
	validateByte('transparency.opaqueAlpha', transparency.opaqueAlpha);

	if (!Number.isFinite(processing.chunkDurationMs) || processing.chunkDurationMs <= 0) {
		throw new RangeError('processing.chunkDurationMs must be greater than zero');
	}

	validateProgress(processing.progress);

	for (const [index, weight] of mapping.distanceWeights.entries()) {
		if (!Number.isFinite(weight) || weight < 0) {
			throw new RangeError(`mapping.distanceWeights[${index}] must be non-negative`);
		}
	}

	for (const [index, weight] of mapping.luminanceWeights.entries()) {
		if (!Number.isFinite(weight) || weight < 0) {
			throw new RangeError(`mapping.luminanceWeights[${index}] must be non-negative`);
		}
	}

	if (
		output.quality !== undefined &&
		(!Number.isFinite(output.quality) || output.quality < 0 || output.quality > 1)
	) {
		throw new RangeError('output.quality must be between zero and one');
	}
}

/** Validates a channel-like value represented by an integer byte. */
function validateByte(name: string, value: number): void {
	if (!Number.isInteger(value) || value < 0 || value > 255) {
		throw new RangeError(`${name} must be an integer between zero and 255`);
	}
}

/** Ensures progress milestones are finite, normalized, and non-decreasing. */
function validateProgress(progress: RecolorConfig['processing']['progress']): void {
	const values = [
		progress.start,
		progress.imageLoaded,
		progress.pixelsRead,
		progress.processingComplete,
		progress.complete
	];

	if (
		values.some((value) => !Number.isFinite(value) || value < 0 || value > 1) ||
		values.some((value, index) => index > 0 && value < values[index - 1])
	) {
		throw new RangeError(
			'processing.progress values must be ordered fractions between zero and one'
		);
	}
}
