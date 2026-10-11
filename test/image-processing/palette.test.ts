import { expect, test } from 'bun:test';
import { zlibSync } from 'fflate';
import {
	CANVAS_CONFIG,
	MAPPING_CONFIG,
	OUTPUT_CONFIG,
	PROCESSING_CONFIG,
	TRANSPARENCY_CONFIG
} from '../../src/lib/config/recolor.ts';
import { recolorSprite } from '../../src/lib/image-processing/engine.ts';
import { extractColorsFromFile } from '../../src/lib/image-processing/palette.ts';
import { decodePng } from '../../src/lib/image-processing/image/png.ts';
import {
	MAX_IMAGE_BYTES,
	validateImageFile
} from '../../src/lib/image-processing/image/validation.ts';
import {
	chunk,
	header,
	makeAdam7RgbaData,
	makeIndexedPng,
	makePng,
	pngBlob
} from '../support/png-fixtures.ts';

const canvasConfig = { willReadFrequently: true, colorSpace: 'srgb' as const };

test('extracts indexed PNG palette samples without applying gamma metadata', async () => {
	const palette = [
		[0, 0, 0],
		[253, 245, 95],
		[117, 40, 2],
		[178, 100, 17],
		[250, 214, 74],
		[255, 253, 224],
		[220, 150, 19],
		[233, 177, 21],
		[252, 245, 95],
		[233, 176, 21]
	];
	const pixels = Array.from({ length: 256 }, (_, index) => (index * 9) % 10);
	const png = makeIndexedPng(16, 16, palette, pixels, [0, ...Array(9).fill(255)]);

	const colors = await extractColorsFromFile(
		pngBlob(png),
		{ maxColors: 64, alphaThreshold: 128 },
		canvasConfig
	);

	expect(colors).toHaveLength(9);
	expect(new Set(colors.map(({ r, g, b }) => `${r},${g},${b}`)).size).toBe(9);
	expect(colors.some(({ r, g, b }) => r === 253 && g === 245 && b === 95)).toBe(true);
});

test('decodes interlaced RGBA PNG pixels into their original row-major order', () => {
	const width = 3;
	const height = 3;
	const pixels = Array.from({ length: width * height }, (_, index) => [
		index * 10,
		index * 10 + 1,
		index * 10 + 2,
		index === 4 ? 0 : 255
	]);
	const raw = makeAdam7RgbaData(width, height, pixels);
	const png = makePng([
		chunk('IHDR', header(width, height, 8, 6, 1)),
		chunk('IDAT', zlibSync(raw)),
		chunk('IEND', new Uint8Array())
	]);

	const decoded = decodePng(png);

	expect(decoded.width).toBe(width);
	expect(decoded.height).toBe(height);
	expect([...decoded.data]).toEqual(pixels.flat());
});

test('extracts packed 4-bit indexed PNG samples exactly', async () => {
	const palette = [
		[10, 20, 30],
		[240, 230, 220]
	];
	const png = makeIndexedPng(4, 1, palette, [0, 1, 1, 0], [255, 255], 4);

	const colors = await extractColorsFromFile(
		pngBlob(png),
		{ maxColors: 64, alphaThreshold: 128 },
		canvasConfig
	);

	expect(colors).toHaveLength(2);
	expect(new Set(colors.map(({ r, g, b }) => `${r},${g},${b}`)).size).toBe(2);
});

test('accepts PNG images up to the configured dimensions', async () => {
	const png = makeIndexedPng(512, 512, [[20, 40, 60]], Array(512 * 512).fill(0), [255]);

	await expect(validateImageFile(pngBlob(png))).resolves.toBeUndefined();
});

test('yields to the event loop while extracting a maximum-size palette image', async () => {
	const png = makeIndexedPng(512, 512, [[20, 40, 60]], Array(512 * 512).fill(0), [255]);
	let timerRan = false;
	setTimeout(() => {
		timerRan = true;
	}, 0);

	await extractColorsFromFile(
		pngBlob(png),
		{ maxColors: 64, alphaThreshold: 128 },
		canvasConfig
	);

	expect(timerRan).toBe(true);
});

test('rejects non-PNG, oversized, and over-dimensioned uploads', async () => {
	await expect(validateImageFile(new Blob(['not a png'], { type: 'image/png' }))).rejects.toThrow(
		'validation.notPng'
	);
	await expect(
		validateImageFile(new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)]))
	).rejects.toThrow('validation.tooLarge');

	const oversized = makeIndexedPng(513, 1, [[20, 40, 60]], [0], [255]);
	await expect(validateImageFile(pngBlob(oversized))).rejects.toThrow(
		'validation.tooBig'
	);
});

test('PNG decoder rejects excessive dimensions before inflating image data', () => {
	const png = makePng([
		chunk('IHDR', header(513, 1, 8, 6, 0)),
		chunk('IDAT', zlibSync(new Uint8Array())),
		chunk('IEND', new Uint8Array())
	]);

	expect(() => decodePng(png)).toThrow(
		'PNG dimensions exceed the supported 512 × 512 pixel limit'
	);
});

test('palette extraction and recoloring reject files that are not PNG', async () => {
	const invalidFile = new File(['not a png'], 'sprite.png', { type: 'image/png' });

	await expect(
		extractColorsFromFile(
			invalidFile,
			{ maxColors: 64, alphaThreshold: 128 },
			canvasConfig
		)
	).rejects.toThrow('validation.notPng');

	await expect(
		recolorSprite(invalidFile, [], {
			canvas: CANVAS_CONFIG,
			mapping: MAPPING_CONFIG,
			transparency: TRANSPARENCY_CONFIG,
			processing: {
				...PROCESSING_CONFIG,
				onProgress: () => {},
				isCancelled: () => false
			},
			output: OUTPUT_CONFIG
		})
	).rejects.toThrow('validation.notPng');
});
