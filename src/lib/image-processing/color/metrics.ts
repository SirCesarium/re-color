import type { Rgb, RgbWeights } from '../types.ts';

/** Packs RGB channel values into a 24-bit `0xRRGGBB` integer key. */
export function rgbToKey({ r, g, b }: Rgb): number {
	return (r << 16) | (g << 8) | b;
}

/** Unpacks a 24-bit `0xRRGGBB` integer key into RGB channels. */
export function keyToRgb(key: number): Rgb {
	return {
		r: (key >> 16) & 0xff,
		g: (key >> 8) & 0xff,
		b: key & 0xff
	};
}

/** Calculates weighted RGB luminance using red, green, and blue coefficients. */
export function luminance(color: Rgb, weights: RgbWeights): number {
	return color.r * weights[0] + color.g * weights[1] + color.b * weights[2];
}

/** Calculates squared weighted Euclidean distance between two RGB colors. */
export function weightedDistance(a: Rgb, b: Rgb, weights: RgbWeights): number {
	const dr = a.r - b.r;
	const dg = a.g - b.g;
	const db = a.b - b.b;

	return weights[0] * dr * dr + weights[1] * dg * dg + weights[2] * db * db;
}
