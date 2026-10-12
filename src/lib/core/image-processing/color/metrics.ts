import type { Rgb, RgbWeights } from '../types.ts';

/**
 * Packs an RGB color into a single number so it works as a map key.
 * Every color lookup in the pipeline goes through this instead of shuffling
 * `{ r, g, b }` tuples around.
 */
export function rgbToKey({ r, g, b }: Rgb): number {
	return (r << 16) | (g << 8) | b;
}

/** Inverse of {@link rgbToKey}; pulls the channels back out of the packed key. */
export function keyToRgb(key: number): Rgb {
	return {
		r: (key >> 16) & 0xff,
		g: (key >> 8) & 0xff,
		b: key & 0xff
	};
}

/**
 * Weighted sum of the channels, used to rank colors by brightness. The weights
 * say how much each channel counts as light; the defaults approximate the eye.
 */
export function luminance(color: Rgb, weights: RgbWeights): number {
	return color.r * weights[0] + color.g * weights[1] + color.b * weights[2];
}

/**
 * Weighted distance between two colors, squared.
 *
 * The square root is skipped on purpose: every caller only ever compares
 * distances, never reports one, so `sqrt` would cost us for nothing.
 */
export function weightedDistance(a: Rgb, b: Rgb, weights: RgbWeights): number {
	const dr = a.r - b.r;
	const dg = a.g - b.g;
	const db = a.b - b.b;

	return weights[0] * dr * dr + weights[1] * dg * dg + weights[2] * db * db;
}
