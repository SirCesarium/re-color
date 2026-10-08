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

function pngBlob(bytes: Uint8Array): Blob {
	const buffer = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(buffer).set(bytes);
	return new Blob([buffer], { type: 'image/png' });
}

function makeIndexedPng(
	width: number,
	height: number,
	palette: number[][],
	pixels: number[],
	transparency: number[],
	bitDepth = 8
): Uint8Array {
	const rowBytes = Math.ceil((width * bitDepth) / 8);
	const rows = new Uint8Array(height * (rowBytes + 1));
	for (let y = 0; y < height; y++) {
		const rowOffset = y * (rowBytes + 1);
		rows[rowOffset] = 0;
		for (let x = 0; x < width; x++) {
			const pixel = pixels[y * width + x];
			if (bitDepth === 8) {
				rows[rowOffset + 1 + x] = pixel;
			} else {
				const bitOffset = x * bitDepth;
				const shift = 8 - bitDepth - (bitOffset % 8);
				rows[rowOffset + 1 + Math.floor(bitOffset / 8)] |= pixel << shift;
			}
		}
	}

	const paletteBytes = new Uint8Array(palette.flat());
	return makePng([
		chunk('IHDR', header(width, height, bitDepth, 3, 0)),
		chunk('gAMA', new Uint8Array([0, 0, 177, 143])),
		chunk('PLTE', paletteBytes),
		chunk('tRNS', new Uint8Array(transparency)),
		chunk('IDAT', zlibSync(rows)),
		chunk('IEND', new Uint8Array())
	]);
}

function header(
	width: number,
	height: number,
	bitDepth: number,
	colorType: number,
	interlace: number
): Uint8Array {
	const bytes = new Uint8Array(13);
	const view = new DataView(bytes.buffer);
	view.setUint32(0, width);
	view.setUint32(4, height);
	bytes[8] = bitDepth;
	bytes[9] = colorType;
	bytes[12] = interlace;
	return bytes;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
	const name = new TextEncoder().encode(type);
	const bytes = new Uint8Array(data.length + 12);
	const view = new DataView(bytes.buffer);
	view.setUint32(0, data.length);
	bytes.set(name, 4);
	bytes.set(data, 8);
	view.setUint32(bytes.length - 4, crc32(bytes.subarray(4, bytes.length - 4)));
	return bytes;
}

function makePng(chunks: Uint8Array[]): Uint8Array {
	const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
	const output = new Uint8Array(signature.length + chunks.reduce((sum, part) => sum + part.length, 0));
	output.set(signature);
	let offset = signature.length;
	for (const part of chunks) {
		output.set(part, offset);
		offset += part.length;
	}
	return output;
}

function makeAdam7RgbaData(width: number, height: number, pixels: number[][]): Uint8Array {
	const passes = [
		[0, 0, 8, 8],
		[4, 0, 8, 8],
		[0, 4, 4, 8],
		[2, 0, 4, 4],
		[0, 2, 2, 4],
		[1, 0, 2, 2],
		[0, 1, 1, 2]
	];
	const bytes: number[] = [];

	for (const [startX, startY, stepX, stepY] of passes) {
		const passWidth = width <= startX ? 0 : Math.ceil((width - startX) / stepX);
		const passHeight = height <= startY ? 0 : Math.ceil((height - startY) / stepY);
		if (passWidth === 0 || passHeight === 0) continue;

		for (let row = 0; row < passHeight; row++) {
			bytes.push(0);
			for (let column = 0; column < passWidth; column++) {
				const x = startX + column * stepX;
				const y = startY + row * stepY;
				bytes.push(...pixels[y * width + x]);
			}
		}
	}

	return new Uint8Array(bytes);
}

function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (const byte of bytes) {
		crc ^= byte;
		for (let bit = 0; bit < 8; bit++) {
			crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}
