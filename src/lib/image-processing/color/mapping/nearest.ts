import { keyToRgb, weightedDistance } from '../metrics.ts';
import type { ColorMappingInput, Rgb } from '../../types.ts';

/**
 * Maps each source color to its nearest active palette entry using weighted RGB distance.
 *
 * @param input Source keys, active palette, channel weights, and processing metadata.
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
