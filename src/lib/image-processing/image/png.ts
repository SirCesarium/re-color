import { unzlibSync } from 'fflate';
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

type Pass = { x: number; y: number; dx: number; dy: number };

type PngHeader = {
	width: number;
	height: number;
	bitDepth: number;
	colorType: number;
	interlace: number;
};

export type DecodedPng = {
	width: number;
	height: number;
	data: Uint8ClampedArray<ArrayBuffer>;
};

/** Returns whether the bytes begin with the PNG signature. */
export function isPng(data: Uint8Array): boolean {
	return SIGNATURE.every((byte, index) => data[index] === byte);
}

/**
 * Decodes PNG samples directly, bypassing browser color-profile and gamma conversion.
 *
 * Supports indexed, grayscale, truecolor, and alpha PNGs, including Adam7 interlacing.
 */
export function decodePng(data: Uint8Array): DecodedPng {
	if (!isPng(data)) throw new TypeError('Input is not a PNG image');

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
				offset = nextOffset;
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

	validateHeader(header, palette, transparency);

	const compressedLength = compressed.reduce((total, part) => total + part.length, 0);
	const compressedData = new Uint8Array(compressedLength);
	let compressedOffset = 0;
	for (const part of compressed) {
		compressedData.set(part, compressedOffset);
		compressedOffset += part.length;
	}

	const raw = unzlibSync(compressedData);
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
				writePixel(
					row,
					column,
					x,
					y,
					header,
					palette,
					transparency,
					rgba
				);
			}

			previous = row;
		}
	}

	if (rawOffset !== raw.length) throw new Error('PNG contains unexpected decompressed pixel data');

	return { width: header.width, height: header.height, data: rgba };
}

function readChunkType(data: Uint8Array, offset: number): string {
	return String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
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
	if (!depths?.includes(header.bitDepth)) throw new Error('Unsupported PNG color type or bit depth');
	if (header.interlace !== 0 && header.interlace !== 1) throw new Error('Unsupported PNG interlace method');
	if (header.colorType === 3 && (!palette || palette.length === 0 || palette.length % 3 !== 0)) {
		throw new Error('Indexed PNG is missing a valid palette');
	}
	if (
		palette &&
		(palette.length > 768 ||
			(header.colorType === 3 && palette.length / 3 > 1 << header.bitDepth))
	) {
		throw new Error('PNG palette has too many entries');
	}
	if (
		(transparency && header.colorType === 0 && transparency.length !== 2) ||
		(transparency && header.colorType === 2 && transparency.length !== 6) ||
		(transparency && header.colorType === 3 && (!palette || transparency.length > palette.length / 3)) ||
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

function readSample(row: Uint8Array, pixel: number, component: number, channels: number, depth: number): number {
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
