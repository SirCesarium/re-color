import type { ColorMappingInput, Rgb } from '../../types.ts';
import { keyToRgb, weightedDistance } from '../metrics.ts';

/**
 * Maps each source color to the closest active palette entry in weighted RGB
 * space: simple, and usually what people expect from "recolor with this palette".
 *
 * @param input Source keys, active palette, distance weights, and the rest of the config.
 * @returns A mapping for every source key; empty when the palette is empty.
 */
export function mapNearest(input: ColorMappingInput): ReadonlyMap<number, Rgb> {
	const result = new Map<number, Rgb>();
	const { keys, palette, config } = input;

	if (palette.length === 0) return result;

	for (const key of keys) {
		const source = keyToRgb(key);
		let best = palette[0];
		let bestDistance = weightedDistance(source, best, config.distanceWeights);

		for (let index = 1; index < palette.length; index++) {
			const candidate = weightedDistance(source, palette[index], config.distanceWeights);

			if (candidate < bestDistance) {
				bestDistance = candidate;
				best = palette[index];
			}
		}

		result.set(key, best);
	}

	return result;
}
