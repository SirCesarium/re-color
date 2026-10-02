export type PaletteColor = {
	r: number;
	g: number;
	b: number;
	active: boolean;
};

export type MappingMode = 'nearest' | 'luminance' | 'dominant';

export const cssRgb = (color: PaletteColor) => `rgb(${color.r} ${color.g} ${color.b})`;

const luminance = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

const keyLuminance = (key: number) =>
	luminance((key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff);

const colorLuminance = (color: PaletteColor) => luminance(color.r, color.g, color.b);

const distance = (key: number, color: PaletteColor) => {
	const dr = ((key >> 16) & 0xff) - color.r;
	const dg = ((key >> 8) & 0xff) - color.g;
	const db = (key & 0xff) - color.b;
	return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
};

function pairByRank(
	keys: number[],
	colors: PaletteColor[],
	lut: Map<number, PaletteColor>
): void {
	const count = keys.length;
	const size = colors.length;
	if (count === 0 || size === 0) return;

	for (let i = 0; i < count; i++) {
		const index = count === 1 ? 0 : Math.round((i * (size - 1)) / (count - 1));
		lut.set(keys[i], colors[index]);
	}
}

export function buildLut(
	keys: number[],
	palette: PaletteColor[],
	mode: MappingMode,
	counts: Map<number, number>
): Map<number, PaletteColor> {
	const active = palette.filter((color) => color.active);
	const lut = new Map<number, PaletteColor>();
	if (active.length === 0) return lut;

	if (mode === 'nearest') {
		for (const key of keys) {
			let best = active[0];
			let bestDistance = distance(key, best);

			for (let i = 1; i < active.length; i++) {
				const candidate = distance(key, active[i]);
				if (candidate < bestDistance) {
					bestDistance = candidate;
					best = active[i];
				}
			}

			lut.set(key, best);
		}

		return lut;
	}

	if (mode === 'dominant') {
		const first = [...keys].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))[0];
		lut.set(first, active[0]);

		const rest = keys.filter((key) => key !== first).sort((a, b) => keyLuminance(a) - keyLuminance(b));
		const restPalette = active.slice(1).sort((a, b) => colorLuminance(a) - colorLuminance(b));
		pairByRank(rest, restPalette, lut);
		fill(lut, keys, active[0]);

		return lut;
	}

	const sortedKeys = [...keys].sort((a, b) => keyLuminance(a) - keyLuminance(b));
	const sortedPalette = active.slice().sort((a, b) => colorLuminance(a) - colorLuminance(b));

	if (sortedKeys.length === 1 && sortedPalette.length > 1) {
		const key = sortedKeys[0];
		lut.set(
			key,
			sortedPalette.reduce((best, color) =>
				Math.abs(colorLuminance(color) - keyLuminance(key)) <
				Math.abs(colorLuminance(best) - keyLuminance(key))
					? color
					: best
			)
		);
		return lut;
	}

	pairByRank(sortedKeys, sortedPalette, lut);
	fill(lut, keys, active[0]);

	return lut;
}

function fill(lut: Map<number, PaletteColor>, keys: number[], fallback: PaletteColor): void {
	for (const key of keys) {
		if (!lut.has(key)) lut.set(key, fallback);
	}
}
