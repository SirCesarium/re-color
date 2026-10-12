import { keyToRgb, rgbToKey } from './color/metrics.ts';
import { validateExtractionConfig } from './config-schema.ts';
import type { CanvasConfig } from './image/canvas.ts';
import {
	context2d,
	createCanvas,
	loadImage,
	readPixels
} from './image/canvas.ts';
import { yieldToBrowser } from './image/scheduler.ts';
import { validateImageFile } from './image/validation.ts';
import type { PaletteColor, PaletteExtractionConfig } from './types.ts';

/**
 * Picks the most frequent colors of an image to use as a palette.
 *
 * Nearly transparent pixels are ignored; the survivors are sorted by frequency,
 * cut down to `maxColors`, and returned active so they can map right away.
 *
 * @param image Image to sample.
 * @param config Maximum palette size and the alpha cutoff.
 * @param canvas Canvas hints used while reading the pixels.
 * @returns Colors from most to least frequent.
 * @throws {RangeError} If `maxColors` or `alphaThreshold` is out of range.
 * @throws If the canvas cannot be created or read.
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
 * Same idea as {@link extractColors}, but from a file.
 *
 * PNGs are read from their stored samples, so the browser's color management
 * cannot quietly shift the palette away from what the file actually contains.
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
		return await colorsFromRgbaAsync(
			image.pixels ?? readPixels(image, canvas).data,
			config
		);
	} finally {
		image.close();
	}
}

function colorsFromRgba(
	data: Uint8ClampedArray,
	config: PaletteExtractionConfig
): PaletteColor[] {
	const counts = new Map<number, number>();

	for (let index = 0; index < data.length; index += 4) {
		if (data[index + 3] < config.alphaThreshold) continue;

		const key = rgbToKey({
			r: data[index],
			g: data[index + 1],
			b: data[index + 2]
		});

		counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	return sortedColors(counts, config);
}

async function colorsFromRgbaAsync(
	data: Uint8ClampedArray,
	config: PaletteExtractionConfig
): Promise<PaletteColor[]> {
	const counts = new Map<number, number>();
	let index = 0;

	while (index < data.length) {
		const start = performance.now();

		while (index < data.length && performance.now() - start < 6) {
			if (data[index + 3] >= config.alphaThreshold) {
				const key = rgbToKey({
					r: data[index],
					g: data[index + 1],
					b: data[index + 2]
				});
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}

			index += 4;
		}

		if (index < data.length) await yieldToBrowser();
	}

	return sortedColors(counts, config);
}

function sortedColors(
	counts: Map<number, number>,
	config: PaletteExtractionConfig
): PaletteColor[] {
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, config.maxColors)
		.map(([key]) => ({ ...keyToRgb(key), active: true }));
}
