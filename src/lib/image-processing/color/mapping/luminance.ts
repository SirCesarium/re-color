import { keyToRgb, luminance } from '../metrics.ts';
import type { ColorMappingInput, Rgb } from '../../types.ts';
import { fillUnmapped, pairByRank } from './shared.ts';

/**
 * Maps source and palette colors by their ascending weighted luminance.
 *
 * A single source color is mapped to the palette entry with the nearest luminance.
 * Missing rank matches use the configured fallback behavior.
 *
 * @param input Source keys, active palette, luminance weights, and fallback policy.
 * @returns A mapping for matched keys, with fallback entries when configured.
 */
export function mapByLuminance(input: ColorMappingInput): ReadonlyMap<number, Rgb> {
	const { keys, palette, config } = input;
	const result = new Map<number, Rgb>();

	if (palette.length === 0) return result;

	const sortedKeys = [...keys].sort(
		(a, b) =>
			luminance(keyToRgb(a), config.luminanceWeights) -
			luminance(keyToRgb(b), config.luminanceWeights)
	);
	const sortedPalette = [...palette].sort(
		(a, b) => luminance(a, config.luminanceWeights) - luminance(b, config.luminanceWeights)
	);

	if (sortedKeys.length === 1 && sortedPalette.length > 1) {
		const key = sortedKeys[0];
		const sourceLuminance = luminance(keyToRgb(key), config.luminanceWeights);

		const closest = sortedPalette.reduce((best, color) =>
			Math.abs(luminance(color, config.luminanceWeights) - sourceLuminance) <
			Math.abs(luminance(best, config.luminanceWeights) - sourceLuminance)
				? color
				: best
		);

		result.set(key, closest);

		return result;
	}

	pairByRank(sortedKeys, sortedPalette, result);

	fillUnmapped(result, keys, palette, config.fallback);

	return result;
}
