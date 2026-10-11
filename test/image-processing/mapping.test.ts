import { expect, test } from 'bun:test';
import { keyToRgb, luminance, rgbToKey, weightedDistance } from '../../src/lib/image-processing/color/metrics.ts';
import { mapDominant } from '../../src/lib/image-processing/color/mapping/dominant.ts';
import { mapByLuminance } from '../../src/lib/image-processing/color/mapping/luminance.ts';
import { mapNearest } from '../../src/lib/image-processing/color/mapping/nearest.ts';
import { createColorLookup } from '../../src/lib/image-processing/color/mapping/registry.ts';
import { fillUnmapped, pairByRank } from '../../src/lib/image-processing/color/mapping/shared.ts';
import type {
	ColorMappingConfig,
	ColorMappingInput,
	MappingMode,
	Rgb,
	RgbWeights
} from '../../src/lib/image-processing/types.ts';

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const NEUTRAL_WEIGHTS: RgbWeights = [1, 1, 1];
const LUMA_WEIGHTS: RgbWeights = [0.2126, 0.7152, 0.0722];

function key(color: Rgb): number {
	return rgbToKey(color);
}

function mappingConfig(
	overrides: Partial<Omit<ColorMappingConfig, 'strategy'>> = {}
): Omit<ColorMappingConfig, 'strategy'> {
	return {
		mode: 'nearest',
		distanceWeights: NEUTRAL_WEIGHTS,
		luminanceWeights: LUMA_WEIGHTS,
		fallback: 'first-active',
		...overrides
	};
}

function mappingInput(
	keys: readonly number[],
	palette: readonly Rgb[],
	overrides: Partial<Omit<ColorMappingConfig, 'strategy'>> = {},
	counts: ReadonlyMap<number, number> = new Map(keys.map((entry) => [entry, 1]))
): ColorMappingInput {
	return {
		keys,
		palette,
		counts,
		config: mappingConfig(overrides),
		isCancelled: () => false
	};
}

test('rgbToKey and keyToRgb roundtrip boundary colors', () => {
	const colors: Rgb[] = [
		{ r: 0, g: 0, b: 0 },
		{ r: 255, g: 255, b: 255 },
		{ r: 1, g: 1, b: 1 },
		{ r: 0, g: 255, b: 0 },
		{ r: 128, g: 64, b: 32 },
		{ r: 255, g: 0, b: 255 }
	];

	for (const color of colors) {
		expect(keyToRgb(rgbToKey(color))).toEqual(color);
	}

	expect(rgbToKey({ r: 255, g: 0, b: 0 })).toBe(0xff0000);
	expect(rgbToKey({ r: 0, g: 0, b: 255 })).toBe(0x0000ff);
});

test('weightedDistance is symmetric and zero for identical colors', () => {
	const a: Rgb = { r: 10, g: 200, b: 30 };
	const b: Rgb = { r: 200, g: 10, b: 250 };

	expect(weightedDistance(a, a, NEUTRAL_WEIGHTS)).toBe(0);
	expect(weightedDistance(a, b, [2, 4, 3])).toBe(weightedDistance(b, a, [2, 4, 3]));
	expect(weightedDistance(a, b, [0, 0, 0])).toBe(0);
});

test('luminance applies its weights and vanishes when every weight is zero', () => {
	expect(luminance({ r: 255, g: 0, b: 0 }, LUMA_WEIGHTS)).toBeCloseTo(255 * 0.2126);
	expect(luminance({ r: 255, g: 255, b: 255 }, LUMA_WEIGHTS)).toBeCloseTo(255);
	expect(luminance({ r: 13, g: 200, b: 99 }, [0, 0, 0])).toBe(0);
});

test('mapNearest maps every source key to its closest palette color', () => {
	const nearRed: Rgb = { r: 250, g: 5, b: 5 };
	const nearBlue: Rgb = { r: 5, g: 5, b: 250 };
	const palette: Rgb[] = [{ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 }];

	const lookup = mapNearest(mappingInput([key(nearRed), key(nearBlue)], palette));

	expect(lookup.size).toBe(2);
	expect(lookup.get(key(nearRed))).toEqual(palette[0]);
	expect(lookup.get(key(nearBlue))).toEqual(palette[1]);
});

test('mapNearest keeps the first palette color on distance ties', () => {
	// Both candidates sit exactly 100 red units away from the source.
	const source: Rgb = { r: 100, g: 0, b: 0 };
	const darker: Rgb = { r: 0, g: 0, b: 0 };
	const lighter: Rgb = { r: 200, g: 0, b: 0 };

	const lookup = mapNearest(mappingInput([key(source)], [darker, lighter]));

	expect(lookup.get(key(source))).toEqual(darker);
});

test('mapNearest decides by the channels its weights emphasize', () => {
	const source: Rgb = { r: 200, g: 0, b: 0 };
	const greenish: Rgb = { r: 100, g: 100, b: 0 };
	const blueish: Rgb = { r: 100, g: 0, b: 100 };

	// Red alone: both candidates are equally distant, order breaks the tie.
	const redOnly = mapNearest(
		mappingInput([key(source)], [greenish, blueish], { distanceWeights: [1, 0, 0] })
	);
	expect(redOnly.get(key(source))).toEqual(greenish);

	// Green alone: blueish matches the source's zero green channel.
	const greenOnly = mapNearest(
		mappingInput([key(source)], [greenish, blueish], { distanceWeights: [0, 1, 0] })
	);
	expect(greenOnly.get(key(source))).toEqual(blueish);

	// Blue alone: greenish matches the source's zero blue channel.
	const blueOnly = mapNearest(
		mappingInput([key(source)], [greenish, blueish], { distanceWeights: [0, 0, 1] })
	);
	expect(blueOnly.get(key(source))).toEqual(greenish);
});

test('mapNearest returns an empty mapping for an empty palette', () => {
	expect(mapNearest(mappingInput([key(WHITE)], [])).size).toBe(0);
});

test('mapByLuminance pairs source and palette colors by ascending luminance', () => {
	const darkest: Rgb = { r: 10, g: 10, b: 10 };
	const middle: Rgb = { r: 120, g: 120, b: 120 };
	const lightest: Rgb = { r: 240, g: 240, b: 240 };
	// Source order is scrambled; only luminance decides the pairing.
	const lookup = mapByLuminance(
		mappingInput([key(lightest), key(darkest), key(middle)], [lightest, darkest, middle])
	);

	expect(lookup.get(key(darkest))).toEqual(darkest);
	expect(lookup.get(key(middle))).toEqual(middle);
	expect(lookup.get(key(lightest))).toEqual(lightest);
});

test('mapByLuminance picks the nearest luminance for a single source color', () => {
	// A lone key must not fall back to the rank-0 (darkest) palette entry.
	const darkGray: Rgb = { r: 40, g: 40, b: 40 };
	const lightGray: Rgb = { r: 200, g: 200, b: 200 };

	const toLight = mapByLuminance(mappingInput([key(lightGray)], [BLACK, WHITE]));
	expect(toLight.get(key(lightGray))).toEqual(WHITE);

	// The palette order must not influence the choice either.
	const toDark = mapByLuminance(mappingInput([key(darkGray)], [WHITE, BLACK]));
	expect(toDark.get(key(darkGray))).toEqual(BLACK);
});

test('mapByLuminance leaves every key mapped whatever the fallback is', () => {
	const keys = [key(BLACK), key(WHITE), key({ r: 128, g: 128, b: 128 })];
	const palette = [BLACK, WHITE];

	// pairByRank covers every key, so the fallback never fires for luminance.
	for (const fallback of ['first-active', 'unmapped'] as const) {
		const lookup = mapByLuminance(mappingInput(keys, palette, { fallback }));

		expect(lookup.size).toBe(3);
	}
});

test('mapByLuminance returns an empty mapping for an empty palette', () => {
	expect(mapByLuminance(mappingInput([key(WHITE)], [])).size).toBe(0);
});

test('mapDominant sends the most frequent source color to the first palette color', () => {
	const background: Rgb = { r: 200, g: 200, b: 200 };
	const accent: Rgb = { r: 250, g: 100, b: 0 };
	const shadow: Rgb = { r: 30, g: 30, b: 30 };
	const palette: Rgb[] = [{ r: 0, g: 128, b: 255 }, { r: 255, g: 255, b: 0 }, { r: 9, g: 9, b: 9 }];
	const counts = new Map([
		[key(accent), 50],
		[key(background), 5],
		[key(shadow), 20]
	]);

	const lookup = mapDominant(
		mappingInput([key(background), key(accent), key(shadow)], palette, {}, counts)
	);

	expect(lookup.get(key(accent))).toEqual(palette[0]);
	// The remaining keys pair with the remaining palette by ascending luminance.
	expect(lookup.get(key(shadow))).toEqual(palette[2]);
	expect(lookup.get(key(background))).toEqual(palette[1]);
});

test('mapDominant resolves frequency ties by source key order', () => {
	const first: Rgb = { r: 255, g: 0, b: 0 };
	const second: Rgb = { r: 0, g: 0, b: 255 };
	const counts = new Map([
		[key(first), 5],
		[key(second), 5]
	]);
	const palette: Rgb[] = [{ r: 1, g: 2, b: 3 }, { r: 4, g: 5, b: 6 }];

	const lookup = mapDominant(mappingInput([key(first), key(second)], palette, {}, counts));

	expect(lookup.get(key(first))).toEqual(palette[0]);
	expect(lookup.get(key(second))).toEqual(palette[1]);
});

test('mapDominant fills unmatched keys when the palette holds a single color', () => {
	const keys = [key(BLACK), key(WHITE), key({ r: 128, g: 128, b: 128 })];
	const only: Rgb = { r: 10, g: 20, b: 30 };
	const counts = new Map(keys.map((entry, index) => [entry, 3 - index]));

	const filled = mapDominant(mappingInput(keys, [only], {}, counts));
	expect(filled.size).toBe(3);
	for (const entry of keys) expect(filled.get(entry)).toEqual(only);

	// The unmapped fallback keeps the non-dominant keys out of the lookup.
	const partial = mapDominant(mappingInput(keys, [only], { fallback: 'unmapped' }, counts));
	expect(partial.size).toBe(1);
	expect(partial.get(keys[0])).toEqual(only);
});

test('mapDominant returns an empty mapping without keys or palette', () => {
	expect(mapDominant(mappingInput([], [BLACK, WHITE])).size).toBe(0);
	expect(mapDominant(mappingInput([key(WHITE)], [])).size).toBe(0);
});

test('pairByRank distributes keys across the full palette range', () => {
	const result = new Map<number, Rgb>();
	const colors = [BLACK, { r: 128, g: 128, b: 128 }, WHITE];

	// Two keys land on the extremes, skipping the middle color entirely.
	pairByRank([1, 2], colors, result);
	expect(result.get(1)).toEqual(BLACK);
	expect(result.get(2)).toEqual(WHITE);
	expect(result.has(3)).toBe(false);

	// A single key anchors to the first color.
	const single = new Map<number, Rgb>();
	pairByRank([7], colors, single);
	expect(single.get(7)).toEqual(BLACK);

	// Empty inputs leave the result untouched.
	pairByRank([], colors, single);
	pairByRank([9], [], single);
	expect(single.size).toBe(1);
});

test('fillUnmapped completes missing keys with the first color or leaves them out', () => {
	const keys = [1, 2, 3];
	const result = new Map<number, Rgb>([[2, WHITE]]);

	fillUnmapped(result, keys, [BLACK, WHITE], 'first-active');
	expect(result.size).toBe(3);
	expect(result.get(1)).toEqual(BLACK);
	expect(result.get(3)).toEqual(BLACK);

	const untouched = new Map<number, Rgb>([[2, WHITE]]);
	fillUnmapped(untouched, keys, [BLACK, WHITE], 'unmapped');
	expect(untouched.size).toBe(1);

	fillUnmapped(untouched, keys, [], 'first-active');
	expect(untouched.size).toBe(1);
});

test('createColorLookup routes each mode to its built-in strategy', () => {
	const palette = [BLACK, WHITE];
	const keys = [key(BLACK), key(WHITE)];

	const modes: MappingMode[] = ['nearest', 'luminance', 'dominant'];

	for (const mode of modes) {
		const lookup = createColorLookup(mappingInput(keys, palette, { mode }), mappingConfig({ mode }));

		expect(lookup).toBeInstanceOf(Map);
		expect((lookup as Map<number, Rgb>).size).toBe(2);
	}
});

test('createColorLookup prefers an injected strategy over the built-in mode', () => {
	const custom: Rgb = { r: 9, g: 9, b: 9 };
	const strategy = {
		id: 'test/custom',
		createLookup: () => new Map([[key(WHITE), custom]])
	};

	const lookup = createColorLookup(mappingInput([key(WHITE)], [BLACK]), {
		...mappingConfig({ mode: 'nearest' }),
		strategy
	});

	expect(lookup).toBeInstanceOf(Map);
	expect((lookup as Map<number, Rgb>).get(key(WHITE))).toEqual(custom);
});

test('createColorLookup awaits asynchronous strategies', async () => {
	const mapped: Rgb = { r: 1, g: 2, b: 3 };
	const strategy = {
		id: 'test/async',
		createLookup: async () => {
			await Promise.resolve();

			return new Map([[key(BLACK), mapped]]);
		}
	};

	const lookup = await createColorLookup(mappingInput([key(BLACK)], [WHITE]), {
		...mappingConfig(),
		strategy
	});

	expect(lookup.get(key(BLACK))).toEqual(mapped);
});

test('createColorLookup forwards settings, counts, and the cancellation hook to plugins', () => {
	let received: ColorMappingInput | null = null;
	const isCancelled = () => true;
	const counts = new Map([[key(BLACK), 42]]);
	const strategy = {
		id: 'test/spy',
		createLookup: (input: ColorMappingInput) => {
			received = input;

			return new Map<number, Rgb>();
		}
	};

	createColorLookup(
		{ ...mappingInput([key(BLACK)], [WHITE], {}, counts), isCancelled },
		{ ...mappingConfig({ mode: 'dominant' }), strategy }
	);

	expect(received).not.toBeNull();
	const input = received as unknown as ColorMappingInput;
	expect(input.isCancelled).toBe(isCancelled);
	expect(input.counts).toBe(counts);
	// The config argument rebuilds the settings the plugin sees; it wins over input.config.
	expect(input.config.mode).toBe('dominant');
	// The plugin never receives the strategy field itself.
	expect('strategy' in input.config).toBe(false);
});

test('createColorLookup propagates synchronous and asynchronous plugin failures', async () => {
	const syncFailure = {
		id: 'test/sync-failure',
		createLookup: () => {
			throw new Error('plugin failed');
		}
	};

	expect(() =>
		createColorLookup(mappingInput([key(BLACK)], [WHITE]), { ...mappingConfig(), strategy: syncFailure })
	).toThrow('plugin failed');

	const asyncFailure = {
		id: 'test/async-failure',
		createLookup: () => Promise.reject(new Error('plugin rejected'))
	};

	await expect(
		createColorLookup(mappingInput([key(BLACK)], [WHITE]), {
			...mappingConfig(),
			strategy: asyncFailure
		})
	).rejects.toThrow('plugin rejected');
});
