import { mapDominant } from './dominant.ts';
import { mapByLuminance } from './luminance.ts';
import { mapNearest } from './nearest.ts';
import type { ColorMappingConfig, ColorMappingInput, Rgb } from '../../types.ts';

const BUILT_IN_STRATEGIES = {
	nearest: mapNearest,
	luminance: mapByLuminance,
	dominant: mapDominant
};

/**
 * Creates a source-color lookup using a built-in algorithm or an injected strategy.
 *
 * @param input Prepared source keys, active palette colors, pixel counts, settings, and cancellation hook.
 * @param config Selects the built-in mode and optional custom strategy.
 * @returns A mapping table or a promise for a plugin-produced mapping table.
 * @throws Errors thrown or rejected by a custom strategy are propagated to the caller.
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
