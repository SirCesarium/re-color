export type PixelPaintMode = 'disable' | 'enable' | 'toggle';

/**
 * Applies one brush stroke to the excluded-pixel list.
 *
 * `toggle` flips every touched pixel independently; `disable` and `enable`
 * force them on or off. Returns `null` when the stroke changes nothing, so
 * callers can skip an empty history entry.
 */
export function paintExclusions(
	excluded: readonly number[],
	indexes: readonly number[],
	mode: PixelPaintMode
): number[] | null {
	const next = new Set(excluded);
	let changed = false;

	for (const index of indexes) {
		if (!Number.isInteger(index) || index < 0) continue;

		const isExcluded = next.has(index);
		const exclude = mode === 'disable' ? true : mode === 'enable' ? false : !isExcluded;

		if (exclude === isExcluded) continue;

		if (exclude) next.add(index);
		else next.delete(index);

		changed = true;
	}

	return changed ? [...next].sort((a, b) => a - b) : null;
}
