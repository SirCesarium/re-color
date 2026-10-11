import { expect, test } from 'bun:test';
import { zlibSync } from 'fflate';
import { decodePng, isPng } from '../../src/lib/image-processing/image/png.ts';
import { chunk, header, makePng, makeSampledPng } from '../support/png-fixtures.ts';

test('decodes grayscale samples at every supported bit depth', () => {
	const cases = [
		{
			bitDepth: 1 as const,
			pixels: [[0], [1], [0], [1]],
			expected: [0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255]
		},
		{
			bitDepth: 2 as const,
			pixels: [[0], [1], [2], [3]],
			expected: [0, 0, 0, 255, 85, 85, 85, 255, 170, 170, 170, 255, 255, 255, 255, 255]
		},
		{
			bitDepth: 4 as const,
			pixels: [[0], [5], [10], [15]],
			expected: [0, 0, 0, 255, 85, 85, 85, 255, 170, 170, 170, 255, 255, 255, 255, 255]
		},
		{
			bitDepth: 8 as const,
			pixels: [[10], [200]],
			expected: [10, 10, 10, 255, 200, 200, 200, 255]
		},
		{
			bitDepth: 16 as const,
			pixels: [[0], [16384], [32768], [65535]],
			expected: [0, 0, 0, 255, 64, 64, 64, 255, 128, 128, 128, 255, 255, 255, 255, 255]
		}
	];

	for (const { bitDepth, pixels, expected } of cases) {
		const png = makeSampledPng({ width: pixels.length, height: 1, colorType: 0, bitDepth, pixels });

		expect([...decodePng(png).data]).toEqual(expected);
	}
});

test('decodes truecolor samples at 8 and 16 bits', () => {
	const eightBit = makeSampledPng({
		width: 2,
		height: 1,
		colorType: 2,
		bitDepth: 8,
		pixels: [
			[1, 2, 3],
			[250, 200, 100]
		]
	});
	expect([...decodePng(eightBit).data]).toEqual([1, 2, 3, 255, 250, 200, 100, 255]);

	const sixteenBit = makeSampledPng({
		width: 2,
		height: 1,
		colorType: 2,
		bitDepth: 16,
		pixels: [
			[65535, 0, 32768],
			[16384, 32896, 65535]
		]
	});
	expect([...decodePng(sixteenBit).data]).toEqual([255, 0, 128, 255, 64, 128, 255, 255]);
});

test('decodes grayscale samples with alpha at 8 and 16 bits', () => {
	const eightBit = makeSampledPng({
		width: 2,
		height: 1,
		colorType: 4,
		bitDepth: 8,
		pixels: [
			[10, 255],
			[20, 0]
		]
	});
	expect([...decodePng(eightBit).data]).toEqual([10, 10, 10, 255, 20, 20, 20, 0]);

	const sixteenBit = makeSampledPng({
		width: 2,
		height: 1,
		colorType: 4,
		bitDepth: 16,
		pixels: [
			[65535, 65535],
			[32768, 32768]
		]
	});
	expect([...decodePng(sixteenBit).data]).toEqual([255, 255, 255, 255, 128, 128, 128, 128]);
});

test('decodes RGBA samples at 8 and 16 bits', () => {
	const eightBit = makeSampledPng({
		width: 2,
		height: 1,
		colorType: 6,
		bitDepth: 8,
		pixels: [
			[1, 2, 3, 4],
			[255, 254, 253, 252]
		]
	});
	expect([...decodePng(eightBit).data]).toEqual([1, 2, 3, 4, 255, 254, 253, 252]);

	const sixteenBit = makeSampledPng({
		width: 1,
		height: 1,
		colorType: 6,
		bitDepth: 16,
		pixels: [[65535, 32768, 16384, 65535]]
	});
	expect([...decodePng(sixteenBit).data]).toEqual([255, 128, 64, 255]);
});

test('decodes indexed PNGs packed below one byte per pixel', () => {
	const oneBit = makeSampledPng({
		width: 4,
		height: 1,
		colorType: 3,
		bitDepth: 1,
		pixels: [[0], [1], [1], [0]],
		plte: [
			[10, 20, 30],
			[40, 50, 60]
		]
	});
	expect([...decodePng(oneBit).data]).toEqual([
		10, 20, 30, 255, 40, 50, 60, 255, 40, 50, 60, 255, 10, 20, 30, 255
	]);

	const twoBit = makeSampledPng({
		width: 4,
		height: 1,
		colorType: 3,
		bitDepth: 2,
		pixels: [[0], [1], [2], [3]],
		plte: [
			[1, 2, 3],
			[4, 5, 6],
			[7, 8, 9],
			[10, 11, 12]
		]
	});
	expect([...decodePng(twoBit).data]).toEqual([
		1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255
	]);
});

test('applies grayscale tRNS samples as alpha', () => {
	const png = makeSampledPng({
		width: 3,
		height: 1,
		colorType: 0,
		bitDepth: 8,
		pixels: [[0], [5], [7]],
		trns: [0, 5]
	});

	expect([...decodePng(png).data]).toEqual([0, 0, 0, 255, 5, 5, 5, 0, 7, 7, 7, 255]);
});

test('applies truecolor tRNS samples as alpha', () => {
	const png = makeSampledPng({
		width: 2,
		height: 1,
		colorType: 2,
		bitDepth: 8,
		pixels: [
			[1, 2, 3],
			[9, 9, 9]
		],
		trns: [0, 1, 0, 2, 0, 3]
	});

	expect([...decodePng(png).data]).toEqual([1, 2, 3, 0, 9, 9, 9, 255]);
});

test('applies indexed tRNS entries as alpha', () => {
	const png = makeSampledPng({
		width: 3,
		height: 1,
		colorType: 3,
		bitDepth: 8,
		pixels: [[0], [1], [2]],
		plte: [
			[1, 2, 3],
			[4, 5, 6],
			[7, 8, 9]
		],
		trns: [255, 0, 128]
	});

	expect([...decodePng(png).data]).toEqual([1, 2, 3, 255, 4, 5, 6, 0, 7, 8, 9, 128]);
});

test('matches 16-bit grayscale tRNS against the raw sample before scaling', () => {
	const png = makeSampledPng({
		width: 2,
		height: 1,
		colorType: 0,
		bitDepth: 16,
		pixels: [[32768], [0]],
		trns: [0x80, 0x00]
	});

	expect([...decodePng(png).data]).toEqual([128, 128, 128, 0, 0, 0, 0, 255]);
});

test('applies each supported row filter while decoding', () => {
	const pixels: number[][] = [];
	for (let y = 0; y < 5; y++) {
		for (let x = 0; x < 3; x++) {
			pixels.push([y * 10 + x, y * 10 + x + 1, y * 10 + x + 2, x === 1 ? 0 : 255]);
		}
	}

	const png = makeSampledPng({
		width: 3,
		height: 5,
		colorType: 6,
		bitDepth: 8,
		pixels,
		// One row per filter type: none, sub, up, average, Paeth.
		filter: (y) => y
	});

	expect([...decodePng(png).data]).toEqual(pixels.flat());
});

test('applies the Paeth filter independently within each Adam7 pass', () => {
	const pixels: number[][] = [];
	for (let y = 0; y < 5; y++) {
		for (let x = 0; x < 5; x++) {
			pixels.push([y * 5 + x, x * 50, y * 50, (x + y) * 30]);
		}
	}

	const png = makeSampledPng({
		width: 5,
		height: 5,
		colorType: 6,
		bitDepth: 8,
		interlace: 1,
		filter: 4,
		pixels
	});

	expect([...decodePng(png).data]).toEqual(pixels.flat());
});

test('decodes interlaced images whose Adam7 passes are empty', () => {
	for (const [width, height] of [
		[1, 1],
		[3, 5],
		[9, 1],
		[8, 8],
		[7, 3]
	]) {
		const pixels = Array.from({ length: width * height }, (_, index) => [index, index, index, 255]);
		const png = makeSampledPng({
			width,
			height,
			colorType: 6,
			bitDepth: 8,
			interlace: 1,
			pixels
		});

		expect([...decodePng(png).data]).toEqual(pixels.flat());
	}
});

test('decodes interlaced indexed PNGs at sub-byte depths', () => {
	const palette = [
		[10, 20, 30],
		[40, 50, 60],
		[70, 80, 90],
		[100, 110, 120]
	];
	const pixels = Array.from({ length: 15 }, (_, index) => [index % 4]);
	const png = makeSampledPng({
		width: 5,
		height: 3,
		colorType: 3,
		bitDepth: 4,
		interlace: 1,
		pixels,
		plte: palette
	});

	const expected = pixels.flatMap(([index]) => [...palette[index], 255]);
	expect([...decodePng(png).data]).toEqual(expected);
});

test('isPng matches the PNG signature', () => {
	expect(isPng(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
	expect(isPng(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 11]))).toBe(false);
	expect(isPng(new Uint8Array([1, 2, 3]))).toBe(false);
});

test('rejects input that is not a PNG image', () => {
	expect(() => decodePng(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toThrow(
		'Input is not a PNG image'
	);
});

test('rejects malformed PNG chunk structure', () => {
	// The header must be the first chunk.
	expect(() => decodePng(makePng([chunk('IEND', new Uint8Array())]))).toThrow(
		'PNG header must be the first chunk'
	);

	// The header appears only once and always measures 13 bytes.
	expect(() =>
		decodePng(
			makePng([
				chunk('IHDR', header(1, 1, 8, 6, 0)),
				chunk('IHDR', header(1, 1, 8, 6, 0))
			])
		)
	).toThrow('Invalid PNG header');
	expect(() => decodePng(makePng([chunk('IHDR', new Uint8Array(12))]))).toThrow(
		'Invalid PNG header'
	);

	// A chunk cannot claim data past the end of the file.
	const oversized = new Uint8Array(12);
	new DataView(oversized.buffer).setUint32(0, 1000);
	oversized.set([73, 72, 68, 82], 4);
	expect(() => decodePng(makePng([oversized]))).toThrow(
		'PNG chunk extends past the end of the file'
	);

	// Only compression and filter method zero are defined.
	const badCompression = header(1, 1, 8, 6, 0);
	badCompression[10] = 1;
	expect(() =>
		decodePng(makePng([chunk('IHDR', badCompression), chunk('IEND', new Uint8Array())]))
	).toThrow('Unsupported PNG compression or filter method');
	const badFilter = header(1, 1, 8, 6, 0);
	badFilter[11] = 1;
	expect(() =>
		decodePng(makePng([chunk('IHDR', badFilter), chunk('IEND', new Uint8Array())]))
	).toThrow('Unsupported PNG compression or filter method');

	// Unknown critical chunks are unsupported.
	expect(() =>
		decodePng(
			makePng([
				chunk('IHDR', header(1, 1, 8, 6, 0)),
				chunk('JUNK', new Uint8Array(0)),
				chunk('IDAT', zlibSync(new Uint8Array(5))),
				chunk('IEND', new Uint8Array())
			])
		)
	).toThrow('Unsupported critical PNG chunk: JUNK');

	// Image data and the end marker are required.
	expect(() => decodePng(makePng([chunk('IHDR', header(1, 1, 8, 6, 0))]))).toThrow(
		'PNG is missing required image data'
	);
	expect(() =>
		decodePng(makePng([chunk('IHDR', header(1, 1, 8, 6, 0)), chunk('IEND', new Uint8Array())]))
	).toThrow('PNG is missing required image data');
	expect(() =>
		decodePng(
			makePng([
				chunk('IHDR', header(1, 1, 8, 6, 0)),
				chunk('IDAT', zlibSync(new Uint8Array(5))),
				chunk('IEND', new Uint8Array())
			])
		)
	).not.toThrow();

	// IEND carries no payload.
	expect(() =>
		decodePng(
			makePng([
				chunk('IHDR', header(1, 1, 8, 6, 0)),
				chunk('IDAT', zlibSync(new Uint8Array(5))),
				chunk('IEND', new Uint8Array([0]))
			])
		)
	).toThrow('Invalid PNG end chunk');
});

test('rejects unsupported header values', () => {
	const decodeWithHeader = (headerBytes: Uint8Array, palette?: Uint8Array, trns?: Uint8Array) => {
		const chunks = [chunk('IHDR', headerBytes)];
		if (palette) chunks.push(chunk('PLTE', palette));
		if (trns) chunks.push(chunk('tRNS', trns));
		chunks.push(chunk('IDAT', zlibSync(new Uint8Array(5))));
		chunks.push(chunk('IEND', new Uint8Array()));

		return () => decodePng(makePng(chunks));
	};

	expect(decodeWithHeader(header(0, 1, 8, 6, 0))).toThrow('Invalid PNG dimensions');
	expect(decodeWithHeader(header(2, 2, 4, 6, 0))).toThrow(
		'Unsupported PNG color type or bit depth'
	);
	expect(decodeWithHeader(header(2, 2, 8, 5, 0))).toThrow(
		'Unsupported PNG color type or bit depth'
	);
	expect(decodeWithHeader(header(2, 2, 8, 6, 2))).toThrow('Unsupported PNG interlace method');
});

test('rejects invalid palette and transparency chunks', () => {
	const decodeWith = (chunks: Uint8Array[]) => () => decodePng(makePng(chunks));
	const image = [chunk('IDAT', zlibSync(new Uint8Array(5))), chunk('IEND', new Uint8Array())];
	const palette = new Uint8Array([1, 2, 3]);

	// Indexed images require a palette, and only one of them.
	expect(decodeWith([chunk('IHDR', header(2, 2, 8, 3, 0)), ...image])).toThrow(
		'Indexed PNG is missing a valid palette'
	);
	expect(
		decodeWith([
			chunk('IHDR', header(2, 2, 8, 3, 0)),
			chunk('PLTE', palette),
			chunk('PLTE', palette),
			...image
		])
	).toThrow('PNG contains more than one palette');

	// Palettes hold at most 256 entries, and at most 1 << bitDepth entries.
	expect(
		decodeWith([
			chunk('IHDR', header(2, 2, 8, 3, 0)),
			chunk('PLTE', new Uint8Array(771)),
			...image
		])
	).toThrow('PNG palette has too many entries');
	expect(
		decodeWith([
			chunk('IHDR', header(2, 2, 1, 3, 0)),
			chunk('PLTE', new Uint8Array(12)),
			...image
		])
	).toThrow('PNG palette has too many entries');

	// tRNS must match the color type and palette.
	expect(
		decodeWith([
			chunk('IHDR', header(2, 2, 8, 0, 0)),
			chunk('tRNS', new Uint8Array([0, 1, 2])),
			...image
		])
	).toThrow('Invalid PNG transparency chunk');
	expect(
		decodeWith([
			chunk('IHDR', header(2, 2, 8, 2, 0)),
			chunk('tRNS', new Uint8Array([0, 1])),
			...image
		])
	).toThrow('Invalid PNG transparency chunk');
	expect(
		decodeWith([
			chunk('IHDR', header(2, 2, 8, 3, 0)),
			chunk('PLTE', new Uint8Array(6)),
			chunk('tRNS', new Uint8Array([0, 1, 2])),
			...image
		])
	).toThrow('Invalid PNG transparency chunk');
	expect(
		decodeWith([
			chunk('IHDR', header(2, 2, 8, 6, 0)),
			chunk('tRNS', new Uint8Array([0, 1])),
			...image
		])
	).toThrow('Invalid PNG transparency chunk');
});

test('rejects decompressed image data that does not match the header', () => {
	const decodeWithIdat = (headerBytes: Uint8Array, data: Uint8Array) => () =>
		decodePng(
			makePng([
				chunk('IHDR', headerBytes),
				chunk('IDAT', zlibSync(data)),
				chunk('IEND', new Uint8Array())
			])
		);
	const row = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8]);

	// A 2 × 2 RGBA image needs two rows.
	expect(decodeWithIdat(header(2, 2, 8, 6, 0), row)).toThrow('PNG pixel data is truncated');

	// A 1 × 1 RGBA image needs exactly one row.
	expect(decodeWithIdat(header(1, 1, 8, 6, 0), new Uint8Array([...row, 9, 9]))).toThrow(
		'PNG contains unexpected decompressed pixel data'
	);

	// Row filters above the Paeth filter are undefined.
	expect(decodeWithIdat(header(1, 1, 8, 6, 0), new Uint8Array([5, 1, 2, 3, 4, 5, 6, 7, 8]))).toThrow(
		'Unsupported PNG row filter'
	);

	// Indexed pixels may only reference palette entries that exist.
	expect(() =>
		decodePng(
			makePng([
				chunk('IHDR', header(1, 1, 8, 3, 0)),
				chunk('PLTE', new Uint8Array([1, 2, 3])),
				chunk('IDAT', zlibSync(new Uint8Array([0, 7]))),
				chunk('IEND', new Uint8Array())
			])
		)
	).toThrow('Indexed PNG references a missing palette entry');
});
