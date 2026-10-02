export type PaletteColor = {
	r: number;
	g: number;
	b: number;
	active: boolean;
};

const ALPHA_CUTOFF = 128;

export function extractColors(image: HTMLImageElement, maxColors = 64): PaletteColor[] {
	const canvas = document.createElement('canvas');
	canvas.width = image.naturalWidth;
	canvas.height = image.naturalHeight;

	const ctx = canvas.getContext('2d', { willReadFrequently: true });
	if (!ctx) return [];

	ctx.drawImage(image, 0, 0);

	const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
	const counts = new Map<number, number>();

	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3] < ALPHA_CUTOFF) continue;

		const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}

	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, maxColors)
		.map(([key]) => ({
			r: (key >> 16) & 0xff,
			g: (key >> 8) & 0xff,
			b: key & 0xff,
			active: true
		}));
}

export const cssRgb = (color: PaletteColor) => `rgb(${color.r} ${color.g} ${color.b})`;
