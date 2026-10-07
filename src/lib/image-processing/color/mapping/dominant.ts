import { keyToRgb, luminance } from '../metrics.ts';
import type { ColorMappingInput, Rgb } from '../../types.ts';
import { fillUnmapped, pairByRank } from './shared.ts';

/**
 * Maps the most frequent source color to the first palette color.
 *
 * Remaining source colors and palette entries are paired by ascending luminance;
 * unmatched source keys use the configured fallback behavior.
 *
 * @param input Source keys, active palette, pixel counts, luminance weights, and fallback policy.
 * @returns A mapping for the dominant key and ranked remaining keys.
 */
export function mapDominant(input: ColorMappingInput): ReadonlyMap<number, Rgb> {
	const { keys, palette, counts, config } = input;
	const result = new Map<number, Rgb>();

	if (keys.length === 0 || palette.length === 0) return result;

	const first = [...keys].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))[0];

	result.set(first, palette[0]);

	const rest = keys
		.filter((key) => key !== first)
		.sort(
			(a, b) =>
				luminance(keyToRgb(a), config.luminanceWeights) -
				luminance(keyToRgb(b), config.luminanceWeights)
		);
	const restPalette = palette
		.slice(1)
		.sort((a, b) => luminance(a, config.luminanceWeights) - luminance(b, config.luminanceWeights));

	pairByRank(rest, restPalette, result);

	fillUnmapped(result, keys, palette, config.fallback);

	return result;
}
