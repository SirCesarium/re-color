import { keyToRgb, rgbToKey } from './color/metrics.ts';
import type { CanvasConfig } from './image/canvas.ts';
import { context2d, createCanvas, loadImage, readPixels } from './image/canvas.ts';
import { validateImageFile } from './image/validation.ts';
import type { PaletteColor, PaletteExtractionConfig } from './types.ts';

/**
 * Extracts the most frequent colors from a decoded image.
 *
 * Pixels with alpha below `config.alphaThreshold` are ignored. Remaining colors
 * are ordered by descending pixel frequency, truncated to `config.maxColors`,
 * and returned active for use as a mapping palette.
 *
 * @param image Decoded image element to sample.
 * @param config Maximum color count and minimum included alpha.
 * @param canvas Canvas read settings used to sample the image.
 * @returns Distinct colors sorted from most to least frequent.
 * @throws {RangeError} If the maximum count or alpha threshold is invalid.
 * @throws If canvas creation, drawing, or pixel access fails.
 */
export function extractColors(
	image: HTMLImageElement,
	config: PaletteExtractionConfig,
	canvas: CanvasConfig
): PaletteColor[] {
	validateExtractionConfig(config);

	const surface = createCanvas(image.naturalWidth, image.naturalHeight);
	const context = context2d(surface, canvas);

	context.drawImage(image, 0, 0);

	const { data } = context.getImageData(0, 0, surface.width, surface.height);
	return colorsFromRgba(data, config);
}

/**
 * Extracts colors from an input file. PNG samples are decoded directly from
 * their stored pixel values so browser color management cannot change the palette.
 */
export async function extractColorsFromFile(
	file: Blob,
	config: PaletteExtractionConfig,
	canvas: CanvasConfig
): Promise<PaletteColor[]> {
	validateExtractionConfig(config);
	await validateImageFile(file);
	const image = await loadImage(file);

	try {
		return colorsFromRgba(image.pixels ?? readPixels(image, canvas).data, config);
	} finally {
		image.close();
	}
}

function validateExtractionConfig(config: PaletteExtractionConfig): void {
	if (!Number.isInteger(config.maxColors) || config.maxColors < 0) {
		throw new RangeError('maxColors must be a non-negative integer');
	}

	if (
		!Number.isInteger(config.alphaThreshold) ||
		config.alphaThreshold < 0 ||
		config.alphaThreshold > 255
	) {
		throw new RangeError('alphaThreshold must be an integer between zero and 255');
	}
}

function colorsFromRgba(data: Uint8ClampedArray, config: PaletteExtractionConfig): PaletteColor[] {
	const counts = new Map<number, number>();

	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] < config.alphaThreshold) continue;

		const key = rgbToKey({ r: data[index], g: data[index + 1], b: data[index + 2] });

		counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, config.maxColors)
		.map(([key]) => ({ ...keyToRgb(key), active: true }));
}
