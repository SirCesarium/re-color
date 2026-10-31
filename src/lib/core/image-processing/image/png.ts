import { Decompress } from 'fflate';
import { MAX_IMAGE_HEIGHT, MAX_IMAGE_WIDTH } from './validation.ts';

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const ADAM7_PASSES = [
	{ x: 0, y: 0, dx: 8, dy: 8 },
	{ x: 4, y: 0, dx: 8, dy: 8 },
	{ x: 0, y: 4, dx: 4, dy: 8 },
	{ x: 2, y: 0, dx: 4, dy: 4 },
	{ x: 0, y: 2, dx: 2, dy: 4 },
	{ x: 1, y: 0, dx: 2, dy: 2 },
	{ x: 0, y: 1, dx: 1, dy: 2 }
] as const;

type PngHeader = {
	width: number;
	height: number;
	bitDepth: number;
	colorType: number;
	interlace: number;
};

type ParsedChunks = {
	header: PngHeader;
	palette: Uint8Array | null;
	transparency: Uint8Array | null;
	compressed: Uint8Array[];
};

export type DecodedPng = {
	width: number;
	height: number;
	data: Uint8ClampedArray<ArrayBuffer>;
};

/** Whether the bytes start with the 8-byte PNG signature. */
export function isPng(data: Uint8Array): boolean {
	return SIGNATURE.every((byte, index) => data[index] === byte);
}

/**
 * Decodes a PNG into raw RGBA samples.
 *
 * The file is parsed here instead of going through `createImageBitmap` or an
 * `<img>` because browsers apply color-profile and gamma conversion on those
 * paths, which would silently change the very pixels we want to measure.
 * Indexed, grayscale, truecolor and alpha images all work, interlaced or not.
 */
export function decodePng(data: Uint8Array): DecodedPng {
	if (!isPng(data)) throw new TypeError('Input is not a PNG image');

	const { header, palette, transparency, compressed } = parseChunks(data);

	validateHeader(header, palette, transparency);

	// The header decides exactly how many raw bytes the image can use; the
	// inflate refuses to hold more, so a small IDAT cannot balloon into a
	// huge allocation before anything else gets a chance to object.
	const budget = expectedRawSize(header);
	const raw = inflateWithinBudget(concatParts(compressed), budget);
	const rgba = expandPixels(header, palette, transparency, raw);

	return { width: header.width, height: header.height, data: rgba };
}

/** Walks the chunk chain, verifying every checksum, until the end marker. */
function parseChunks(data: Uint8Array): ParsedChunks {
	const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
	let offset = SIGNATURE.length;
	let header: PngHeader | null = null;
	let palette: Uint8Array | null = null;
	let transparency: Uint8Array | null = null;
	let ended = false;
	const compressed: Uint8Array[] = [];

	while (offset + 12 <= data.length) {
		const length = view.getUint32(offset);
		const typeOffset = offset + 4;
		const bodyOffset = offset + 8;
		const nextOffset = bodyOffset + length + 4;

		if (nextOffset > data.length) throw new Error('PNG chunk extends past the end of the file');

		const type = readChunkType(data, typeOffset);
		const body = data.subarray(bodyOffset, bodyOffset + length);
		const expectedCrc = view.getUint32(bodyOffset + length);

		// The PNG checksum covers the chunk's type and body. Verifying it here
		// turns silent corruption into one error that names the chunk at fault.
		if (crc32(data.subarray(typeOffset, bodyOffset + length)) !== expectedCrc) {
			throw new Error(`PNG chunk CRC mismatch: ${type}`);
		}

		if (!header && type !== 'IHDR') throw new Error('PNG header must be the first chunk');

		switch (type) {
			case 'IHDR':
				if (header || length !== 13) throw new Error('Invalid PNG header');
				header = {
					width: view.getUint32(bodyOffset),
					height: view.getUint32(bodyOffset + 4),
					bitDepth: data[bodyOffset + 8],
					colorType: data[bodyOffset + 9],
					interlace: data[bodyOffset + 12]
				};
				if (data[bodyOffset + 10] !== 0 || data[bodyOffset + 11] !== 0) {
					throw new Error('Unsupported PNG compression or filter method');
				}
				break;
			case 'PLTE':
				if (palette) throw new Error('PNG contains more than one palette');
				palette = body.slice();
				break;
			case 'tRNS':
				transparency = body.slice();
				break;
			case 'IDAT':
				compressed.push(body.slice());
				break;
			case 'IEND':
				if (length !== 0) throw new Error('Invalid PNG end chunk');
				ended = true;
				break;
			default:
				if (type.charCodeAt(0) >= 65 && type.charCodeAt(0) <= 90) {
					throw new Error(`Unsupported critical PNG chunk: ${type}`);
				}
		}

		if (ended) break;
		offset = nextOffset;
	}

	if (!ended || !header || compressed.length === 0) {
		throw new Error('PNG is missing required image data');
	}

	return { header, palette, transparency, compressed };
}

/**
 * The exact raw byte count the header's geometry demands — one filter byte
 * plus the packed row per scanline, summed over the interlace passes.
 */
function expectedRawSize(header: PngHeader): number {
	const channels = channelCount(header.colorType);
	const passes = header.interlace === 0 ? [{ x: 0, y: 0, dx: 1, dy: 1 }] : ADAM7_PASSES;
	let total = 0;

	for (const pass of passes) {
		const width = passSize(header.width, pass.x, pass.dx);
		const height = passSize(header.height, pass.y, pass.dy);

		if (width === 0 || height === 0) continue;

		const rowBytes = Math.ceil((width * channels * header.bitDepth) / 8);
		total += (rowBytes + 1) * height;
	}

	return total;
}

/** Joins the IDAT chunks into one contiguous zlib stream. */
function concatParts(parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
	const total = parts.reduce((sum, part) => sum + part.length, 0);
	const joined = new Uint8Array(total);
	let offset = 0;

	for (const part of parts) {
		joined.set(part, offset);
		offset += part.length;
	}

	return joined;
}

/**
 * Inflates the IDAT stream, refusing to hold more than the budget. Accumulation
 * stops the moment the declared image has every byte it could possibly use, so
 * a zip-bomb IDAT costs at most the budget instead of its full expansion.
 */
function inflateWithinBudget(compressed: Uint8Array, budget: number): Uint8Array<ArrayBuffer> {
	const parts: Uint8Array[] = [];
	let size = 0;
	let overshoot = false;

	const decompressor = new Decompress((part) => {
		if (overshoot) return;

		size += part.length;

		if (size > budget) {
			overshoot = true;

			return;
		}

		parts.push(part);
	});

	decompressor.push(compressed, true);

	if (overshoot) {
		throw new RangeError(`PNG pixel data inflates beyond the expected ${budget} bytes`);
	}

	return concatParts(parts);
}

/** Unfilters the raw scanlines and writes them out as RGBA samples. */
function expandPixels(
	header: PngHeader,
	palette: Uint8Array | null,
	transparency: Uint8Array | null,
	raw: Uint8Array<ArrayBuffer>
): Uint8ClampedArray<ArrayBuffer> {
	const outputSize = header.width * header.height * 4;

	if (!Number.isSafeInteger(outputSize)) throw new RangeError('PNG dimensions are too large');

	const rgba = new Uint8ClampedArray(outputSize);
	const channels = channelCount(header.colorType);
	const passes = header.interlace === 0 ? [{ x: 0, y: 0, dx: 1, dy: 1 }] : ADAM7_PASSES;
	let rawOffset = 0;

	for (const pass of passes) {
		const width = passSize(header.width, pass.x, pass.dx);
		const height = passSize(header.height, pass.y, pass.dy);
		if (width === 0 || height === 0) continue;

		const rowBytes = Math.ceil((width * channels * header.bitDepth) / 8);
		const filterBytesPerPixel = Math.max(1, Math.ceil((channels * header.bitDepth) / 8));
		let previous = new Uint8Array(rowBytes);

		for (let rowIndex = 0; rowIndex < height; rowIndex++) {
			if (rawOffset + rowBytes + 1 > raw.length) throw new Error('PNG pixel data is truncated');

			const filter = raw[rawOffset++];
			const row = unfilterRow(
				raw.subarray(rawOffset, rawOffset + rowBytes),
				previous,
				filter,
				filterBytesPerPixel
			);
			rawOffset += rowBytes;

			for (let column = 0; column < width; column++) {
				const x = pass.x + column * pass.dx;
				const y = pass.y + rowIndex * pass.dy;
				writePixel(row, column, x, y, header, palette, transparency, rgba);
			}

			previous = row;
		}
	}

	return rgba;
}

function readChunkType(data: Uint8Array, offset: number): string {
	return String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
}

const CRC_TABLE = buildCrcTable();

function buildCrcTable(): Uint32Array {
	const table = new Uint32Array(256);

	for (let index = 0; index < 256; index++) {
		let value = index;

		for (let bit = 0; bit < 8; bit++) {
			value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
		}

		table[index] = value >>> 0;
	}

	return table;
}

/** The PNG chunk checksum: CRC-32 (IEEE) over a chunk's type and body. */
function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;

	for (const byte of bytes) {
		crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	}

	return (crc ^ 0xffffffff) >>> 0;
}

function validateHeader(
	header: PngHeader,
	palette: Uint8Array | null,
	transparency: Uint8Array | null
): void {
	const legalDepths: Record<number, readonly number[]> = {
		0: [1, 2, 4, 8, 16],
		2: [8, 16],
		3: [1, 2, 4, 8],
		4: [8, 16],
		6: [8, 16]
	};
	const depths = legalDepths[header.colorType];

	if (!header.width || !header.height || !Number.isSafeInteger(header.width * header.height)) {
		throw new RangeError('Invalid PNG dimensions');
	}
	if (header.width > MAX_IMAGE_WIDTH || header.height > MAX_IMAGE_HEIGHT) {
		throw new RangeError('PNG dimensions exceed the supported 512 × 512 pixel limit');
	}
	if (!depths?.includes(header.bitDepth))
		throw new Error('Unsupported PNG color type or bit depth');
	if (header.interlace !== 0 && header.interlace !== 1)
		throw new Error('Unsupported PNG interlace method');
	if (header.colorType === 3 && (!palette || palette.length === 0 || palette.length % 3 !== 0)) {
		throw new Error('Indexed PNG is missing a valid palette');
	}
	if (
		palette &&
		(palette.length > 768 || (header.colorType === 3 && palette.length / 3 > 1 << header.bitDepth))
	) {
		throw new Error('PNG palette has too many entries');
	}
	if (
		(transparency && header.colorType === 0 && transparency.length !== 2) ||
		(transparency && header.colorType === 2 && transparency.length !== 6) ||
		(transparency &&
			header.colorType === 3 &&
			(!palette || transparency.length > palette.length / 3)) ||
		(transparency && (header.colorType === 4 || header.colorType === 6))
	) {
		throw new Error('Invalid PNG transparency chunk');
	}
}

function channelCount(colorType: number): number {
	switch (colorType) {
		case 0:
		case 3:
			return 1;
		case 2:
			return 3;
		case 4:
			return 2;
		case 6:
			return 4;
		default:
			throw new Error(`Unsupported PNG color type: ${colorType}`);
	}
}

function passSize(total: number, start: number, step: number): number {
	return total <= start ? 0 : Math.ceil((total - start) / step);
}

function unfilterRow(
	filtered: Uint8Array<ArrayBuffer>,
	previous: Uint8Array<ArrayBufferLike>,
	filter: number,
	bytesPerPixel: number
): Uint8Array<ArrayBuffer> {
	const row = filtered.slice();

	for (let index = 0; index < row.length; index++) {
		const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
		const above = previous[index] ?? 0;
		const upperLeft = index >= bytesPerPixel ? (previous[index - bytesPerPixel] ?? 0) : 0;

		switch (filter) {
			case 0:
				break;
			case 1:
				row[index] = (row[index] + left) & 255;
				break;
			case 2:
				row[index] = (row[index] + above) & 255;
				break;
			case 3:
				row[index] = (row[index] + Math.floor((left + above) / 2)) & 255;
				break;
			case 4:
				row[index] = (row[index] + paeth(left, above, upperLeft)) & 255;
				break;
			default:
				throw new Error(`Unsupported PNG row filter: ${filter}`);
		}
	}

	return row;
}

function paeth(left: number, above: number, upperLeft: number): number {
	const estimate = left + above - upperLeft;
	const leftDistance = Math.abs(estimate - left);
	const aboveDistance = Math.abs(estimate - above);
	const upperLeftDistance = Math.abs(estimate - upperLeft);

	if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
	return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function readSample(
	row: Uint8Array,
	pixel: number,
	component: number,
	channels: number,
	depth: number
): number {
	const sampleIndex = pixel * channels + component;
	if (depth === 8) return row[sampleIndex];
	if (depth === 16) return (row[sampleIndex * 2] << 8) | row[sampleIndex * 2 + 1];

	const bitOffset = sampleIndex * depth;
	const shift = 8 - depth - (bitOffset % 8);
	return (row[Math.floor(bitOffset / 8)] >>> shift) & ((1 << depth) - 1);
}

function toByte(sample: number, depth: number): number {
	if (depth === 8) return sample;
	const max = depth === 16 ? 65535 : (1 << depth) - 1;
	return Math.round((sample * 255) / max);
}

function writePixel(
	row: Uint8Array,
	column: number,
	x: number,
	y: number,
	header: PngHeader,
	palette: Uint8Array | null,
	transparency: Uint8Array | null,
	output: Uint8ClampedArray
): void {
	const { bitDepth, colorType } = header;
	const channels = channelCount(colorType);
	const target = (y * header.width + x) * 4;
	const first = readSample(row, column, 0, channels, bitDepth);
	let red: number;
	let green: number;
	let blue: number;
	let alpha = 255;

	switch (colorType) {
		case 0:
			red = green = blue = toByte(first, bitDepth);
			if (transparency?.length === 2 && first === ((transparency[0] << 8) | transparency[1])) {
				alpha = 0;
			}
			break;
		case 2: {
			const rawRed = first;
			const rawGreen = readSample(row, column, 1, channels, bitDepth);
			const rawBlue = readSample(row, column, 2, channels, bitDepth);
			red = toByte(rawRed, bitDepth);
			green = toByte(rawGreen, bitDepth);
			blue = toByte(rawBlue, bitDepth);
			if (
				transparency?.length === 6 &&
				rawRed === ((transparency[0] << 8) | transparency[1]) &&
				rawGreen === ((transparency[2] << 8) | transparency[3]) &&
				rawBlue === ((transparency[4] << 8) | transparency[5])
			) {
				alpha = 0;
			}
			break;
		}
		case 3: {
			const paletteOffset = first * 3;
			if (!palette || paletteOffset + 2 >= palette.length) {
				throw new Error('Indexed PNG references a missing palette entry');
			}
			red = palette[paletteOffset];
			green = palette[paletteOffset + 1];
			blue = palette[paletteOffset + 2];
			alpha = transparency?.[first] ?? 255;
			break;
		}
		case 4:
			red = green = blue = toByte(first, bitDepth);
			alpha = toByte(readSample(row, column, 1, channels, bitDepth), bitDepth);
			break;
		case 6:
			red = toByte(first, bitDepth);
			green = toByte(readSample(row, column, 1, channels, bitDepth), bitDepth);
			blue = toByte(readSample(row, column, 2, channels, bitDepth), bitDepth);
			alpha = toByte(readSample(row, column, 3, channels, bitDepth), bitDepth);
			break;
		default:
			throw new Error(`Unsupported PNG color type: ${colorType}`);
	}

	output[target] = red;
	output[target + 1] = green;
	output[target + 2] = blue;
	output[target + 3] = alpha;
}
