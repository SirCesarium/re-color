import type {
	ColorMappingConfig,
	ColorMappingInput,
	Rgb
} from '../../types.ts';
import { mapDominant } from './dominant.ts';
import { mapByLuminance } from './luminance.ts';
import { mapNearest } from './nearest.ts';

const BUILT_IN_STRATEGIES = {
	nearest: mapNearest,
	luminance: mapByLuminance,
	dominant: mapDominant
};

/**
 * Builds the source-color lookup, either with a built-in algorithm or with the
 * caller's injected strategy.
 *
 * @param input Prepared source keys, active palette, pixel counts, settings, and cancellation signal.
 * @param config Selects the built-in mode and the optional custom strategy.
 * @returns A mapping table, or a promise for one when a plugin produced it.
 * @throws Errors thrown or rejected by a custom strategy are passed straight through.
 */
export function createColorLookup(
	input: ColorMappingInput,
	config: ColorMappingConfig
): ReadonlyMap<number, Rgb> | Promise<ReadonlyMap<number, Rgb>> {
	if (config.strategy) {
		return config.strategy.createLookup({
			...input,
			config: {
				mode: config.mode,
				distanceWeights: config.distanceWeights,
				luminanceWeights: config.luminanceWeights,
				fallback: config.fallback
			}
		});
	}

	const strategy = BUILT_IN_STRATEGIES[config.mode];

	return strategy(input);
}
