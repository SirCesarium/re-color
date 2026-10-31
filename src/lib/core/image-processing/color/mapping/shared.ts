import type { Rgb } from '../../types.ts';

/**
 * Spreads the sorted source keys across the sorted target colors by rank: the
 * first key gets the first color, the last key the last one, and the ones in
 * between are spread evenly.
 *
 * @param keys Source RGB keys, ordered by the caller.
 * @param colors Target palette colors, ordered by the caller.
 * @param result Map to populate.
 */
export function pairByRank(
	keys: readonly number[],
	colors: readonly Rgb[],
	result: Map<number, Rgb>
): void {
	if (keys.length === 0 || colors.length === 0) return;

	for (let index = 0; index < keys.length; index++) {
		const colorIndex =
			keys.length === 1 ? 0 : Math.round((index * (colors.length - 1)) / (keys.length - 1));

		result.set(keys[index], colors[colorIndex]);
	}
}

/**
 * Gives every still-unmapped key the first palette color, unless the fallback
 * says to leave them alone (unmapped keys keep their original pixels).
 *
 * @param result Mapping table to complete.
 * @param keys All source RGB keys that may need a target.
 * @param palette Active palette colors in original order.
 * @param fallback `'first-active'` fills the gaps, `'unmapped'` leaves them empty.
 */
export function fillUnmapped(
	result: Map<number, Rgb>,
	keys: readonly number[],
	palette: readonly Rgb[],
	fallback: 'first-active' | 'unmapped'
): void {
	if (fallback === 'unmapped' || palette.length === 0) return;

	for (const key of keys) {
		if (!result.has(key)) result.set(key, palette[0]);
	}
}
