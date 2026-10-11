import { afterEach, beforeEach, expect, test } from 'bun:test';
import { zlibSync } from 'fflate';
import {
	CANVAS_CONFIG,
	MAPPING_CONFIG,
	OUTPUT_CONFIG,
	PROCESSING_CONFIG,
	TRANSPARENCY_CONFIG
} from '../../src/lib/config/recolor.ts';
import { composeExcludedPixels } from '../../src/lib/image-processing/image/canvas.ts';
import { recolorSprite } from '../../src/lib/image-processing/engine.ts';
import type { PaletteColor, RecolorConfig } from '../../src/lib/image-processing/types.ts';
import { chunk, header, makePng } from '../support/png-fixtures.ts';
import {
	installFakeCanvas,
	readObjectUrlPixels,
	rgbaFile,
	rgbaPixels
} from '../support/fake-canvas.ts';

let uninstall: (() => void) | undefined;

beforeEach(() => {
	uninstall = installFakeCanvas();
});

afterEach(() => {
	uninstall?.();
});

function config(overrides: Partial<RecolorConfig> = {}): RecolorConfig {
	return {
		canvas: CANVAS_CONFIG,
		mapping: { ...MAPPING_CONFIG },
		transparency: TRANSPARENCY_CONFIG,
		processing: {
			...PROCESSING_CONFIG,
			onProgress: () => {},
			isCancelled: () => false
		},
		output: OUTPUT_CONFIG,
		...overrides
	};
}

const GREEN: PaletteColor = { r: 0, g: 200, b: 0, active: true };

test('recolors every eligible pixel to the active palette color', async () => {
	const file = rgbaFile(
		2,
		2,
		rgbaPixels(2, 2, (x, y) => {
			const colors = [
				[255, 0, 0, 255],
				[0, 0, 255, 255],
				[255, 255, 0, 255],
				[10, 10, 10, 255]
			] as const;
			const [r, g, b, a] = colors[y * 2 + x];

			return [r, g, b, a];
		})
	);
	const palette: PaletteColor[] = [GREEN, { r: 99, g: 99, b: 99, active: false }];

	const url = await recolorSprite(file, palette, config());

	expect(url).not.toBeNull();
	const output = await readObjectUrlPixels(url as string);
	expect(output.width).toBe(2);
	expect(output.height).toBe(2);
	// The inactive palette color never appears; everything maps to green.
	for (let pixel = 0; pixel < 4; pixel++) {
		expect(output.data.slice(pixel * 4, pixel * 4 + 4)).toEqual([0, 200, 0, 255]);
	}
});

test('emits ordered progress from start to completion', async () => {
	const file = rgbaFile(32, 32, rgbaPixels(32, 32, (x) => [x * 8, 40, 80, 255]));
	const fractions: number[] = [];

	const url = await recolorSprite(file, [GREEN], config({
		processing: {
			...PROCESSING_CONFIG,
			chunkDurationMs: 0.25,
			onProgress: (fraction) => fractions.push(fraction),
			isCancelled: () => false
		}
	}));

	expect(url).not.toBeNull();
	expect(fractions[0]).toBe(0);
	expect(fractions.at(-1)).toBe(1);
	for (let index = 1; index < fractions.length; index++) {
		expect(fractions[index]).toBeGreaterThanOrEqual(fractions[index - 1]);
	}
	// A multi-chunk image reports intermediate fractions between the milestones.
	expect(fractions.some((fraction) => fraction > 0.1 && fraction < 0.9)).toBe(true);
});

test('returns no result and revokes the URL when cancelled after encoding', async () => {
	const file = rgbaFile(4, 4, rgbaPixels(4, 4, () => [10, 20, 30, 255]));
	const revoked: string[] = [];
	const revoke = URL.revokeObjectURL.bind(URL);
	let cancelled = false;

	URL.revokeObjectURL = (url: string) => {
		revoked.push(url);
		revoke(url);
	};

	try {
		const url = await recolorSprite(file, [GREEN], config({
			processing: {
				...PROCESSING_CONFIG,
				onProgress: (fraction) => {
					// Cancelling once the result is encoded must discard the object URL.
					if (fraction >= PROCESSING_CONFIG.progress.complete) cancelled = true;
				},
				isCancelled: () => cancelled
			}
		}));

		expect(url).toBeNull();
		expect(revoked).toHaveLength(1);
	} finally {
		URL.revokeObjectURL = revoke;
	}
});

test('skips encoding when cancelled at the last processing milestone', async () => {
	const file = rgbaFile(4, 4, rgbaPixels(4, 4, () => [10, 20, 30, 255]));
	let cancelled = false;

	const url = await recolorSprite(file, [GREEN], config({
		processing: {
			...PROCESSING_CONFIG,
			onProgress: (fraction) => {
				// The pixel loop reports processingComplete right after its final chunk.
				if (fraction >= PROCESSING_CONFIG.progress.processingComplete) cancelled = true;
			},
			isCancelled: () => cancelled
		}
	}));

	// No URL is ever produced, so there is nothing to revoke.
	expect(url).toBeNull();
});

test('preserves or normalizes alpha according to the transparency config', async () => {
	const file = rgbaFile(
		2,
		1,
		rgbaPixels(2, 1, (x) => (x === 0 ? [200, 0, 0, 200] : [0, 0, 255, 0]))
	);

	const kept = await readObjectUrlPixels(
		(await recolorSprite(file, [GREEN], config())) as string
	);
	// Alpha 200 rides along; the transparent pixel is never touched.
	expect(kept.data).toEqual([0, 200, 0, 200, 0, 0, 255, 0]);

	const normalized = await readObjectUrlPixels(
		(await recolorSprite(file, [GREEN], config({
			transparency: { ...TRANSPARENCY_CONFIG, preserveAlpha: false }
		}))) as string
	);
	expect(normalized.data).toEqual([0, 200, 0, 255, 0, 0, 255, 0]);
});

test('leaves excluded pixels untouched while recoloring the rest', async () => {
	const file = rgbaFile(
		2,
		1,
		rgbaPixels(2, 1, (x) => (x === 0 ? [255, 0, 0, 255] : [0, 0, 255, 255]))
	);

	const url = await recolorSprite(file, [GREEN], config({ excludedPixels: new Set([0]) }));
	const output = await readObjectUrlPixels(url as string);

	expect(output.data).toEqual([255, 0, 0, 255, 0, 200, 0, 255]);
});

test('rejects exclusion indexes that fall outside the image', async () => {
	const file = rgbaFile(2, 1, rgbaPixels(2, 1, () => [5, 5, 5, 255]));

	await expect(
		recolorSprite(file, [GREEN], config({ excludedPixels: new Set([2]) }))
	).rejects.toThrow('excludedPixels contains an invalid pixel index: 2');
});

test('produces no result without an active palette color', async () => {
	const file = rgbaFile(1, 1, rgbaPixels(1, 1, () => [5, 5, 5, 255]));

	const url = await recolorSprite(file, [{ r: 1, g: 2, b: 3, active: false }], config());

	expect(url).toBeNull();
});

test('produces no result when the mapping strategy matches nothing', async () => {
	const file = rgbaFile(1, 1, rgbaPixels(1, 1, () => [5, 5, 5, 255]));
	const strategy = {
		id: 'test/empty',
		createLookup: () => new Map<number, { r: number; g: number; b: number }>()
	};

	const url = await recolorSprite(file, [GREEN], config({
		mapping: { ...MAPPING_CONFIG, strategy }
	}));

	expect(url).toBeNull();
});

test('composes excluded pixels back over an already recolored image', async () => {
	const file = rgbaFile(
		2,
		1,
		rgbaPixels(2, 1, (x) => (x === 0 ? [255, 0, 0, 255] : [0, 0, 255, 255]))
	);
	const previewUrl = await recolorSprite(file, [GREEN], config());

	const composedUrl = await composeExcludedPixels(
		previewUrl as string,
		file,
		new Set([0]),
		CANVAS_CONFIG,
		OUTPUT_CONFIG
	);
	const output = await readObjectUrlPixels(composedUrl);

	expect(output.data).toEqual([255, 0, 0, 255, 0, 200, 0, 255]);
});

test('composing nothing keeps the recolored image unchanged', async () => {
	const file = rgbaFile(2, 1, rgbaPixels(2, 1, () => [9, 9, 9, 255]));
	const previewUrl = await recolorSprite(file, [GREEN], config());

	const composedUrl = await composeExcludedPixels(
		previewUrl as string,
		file,
		new Set(),
		CANVAS_CONFIG,
		OUTPUT_CONFIG
	);
	const output = await readObjectUrlPixels(composedUrl);

	expect(output.data).toEqual([0, 200, 0, 255, 0, 200, 0, 255]);
});

test('composing rejects mismatched dimensions', async () => {
	const base = rgbaFile(2, 2, rgbaPixels(2, 2, () => [9, 9, 9, 255]));
	const smaller = rgbaFile(1, 1, rgbaPixels(1, 1, () => [9, 9, 9, 255]));
	const previewUrl = await recolorSprite(base, [GREEN], config());

	await expect(
		composeExcludedPixels(
			previewUrl as string,
			smaller,
			new Set([0]),
			CANVAS_CONFIG,
			OUTPUT_CONFIG
		)
	).rejects.toThrow('Original and recolored image dimensions do not match');
});

test('composing rejects exclusion indexes outside the image', async () => {
	const file = rgbaFile(2, 1, rgbaPixels(2, 1, () => [9, 9, 9, 255]));
	const previewUrl = await recolorSprite(file, [GREEN], config());

	await expect(
		composeExcludedPixels(
			previewUrl as string,
			file,
			new Set([7]),
			CANVAS_CONFIG,
			OUTPUT_CONFIG
		)
	).rejects.toThrow('excludedPixels contains an invalid pixel index: 7');
});

test('composing surfaces decode failures of the original file', async () => {
	const file = rgbaFile(2, 1, rgbaPixels(2, 1, () => [9, 9, 9, 255]));
	const previewUrl = await recolorSprite(file, [GREEN], config());
	// Passes upload validation (signature and header) but never inflates into pixels.
	const truncated = new File(
		[
			makePng([
				chunk('IHDR', header(2, 2, 8, 6, 0)),
				chunk('IDAT', zlibSync(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8]))),
				chunk('IEND', new Uint8Array())
			])
		],
		'truncated.png',
		{ type: 'image/png' }
	);

	await expect(
		composeExcludedPixels(
			previewUrl as string,
			truncated,
			new Set([0]),
			CANVAS_CONFIG,
			OUTPUT_CONFIG
		)
	).rejects.toThrow('PNG pixel data is truncated');
});
