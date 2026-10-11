import { zlibSync } from 'fflate';

/** PNG row filters: none, sub, up, average, and Paeth. */
type Filter = 0 | 1 | 2 | 3 | 4;

/** Options for building a decodable PNG from raw channel samples. */
export type SampledPngOptions = {
	/** Image width in pixels. */
	width: number;
	/** Image height in pixels. */
	height: number;
	/** PNG color type: 0 gray, 2 truecolor, 3 indexed, 4 gray+alpha, 6 RGBA. */
	colorType: 0 | 2 | 3 | 4 | 6;
	/** Bits per sample: 1, 2, 4, 8, or 16 (subject to the color type). */
	bitDepth: 1 | 2 | 4 | 8 | 16;
	/** One entry of channel samples per pixel, in row-major order. */
	pixels: number[][];
	/** Adam7 interlace flag. */
	interlace?: 0 | 1;
	/** Fixed row filter, or a filter chosen from the global row index. */
	filter?: Filter | ((y: number) => number);
	/** PLTE entries as [red, green, blue] triples. */
	plte?: number[][];
	/** Raw tRNS chunk bytes. */
	trns?: number[];
};

const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

const ADAM7_PASSES = [
	{ x: 0, y: 0, dx: 8, dy: 8 },
	{ x: 4, y: 0, dx: 8, dy: 8 },
	{ x: 0, y: 4, dx: 4, dy: 8 },
	{ x: 2, y: 0, dx: 4, dy: 4 },
	{ x: 0, y: 2, dx: 2, dy: 4 },
	{ x: 1, y: 0, dx: 2, dy: 2 },
	{ x: 0, y: 1, dx: 1, dy: 2 }
] as const;

/** Builds a PNG file from ready-made chunks. */
export function makePng(chunks: Uint8Array[]): Uint8Array<ArrayBuffer> {
	const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
	const output = new Uint8Array(
		signature.length + chunks.reduce((sum, part) => sum + part.length, 0)
	);
	output.set(signature);
	let offset = signature.length;
	for (const part of chunks) {
		output.set(part, offset);
		offset += part.length;
	}
	return output;
}

/** Builds a PNG chunk with a valid length and CRC. */
export function chunk(type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
	const name = new TextEncoder().encode(type);
	const bytes = new Uint8Array(data.length + 12);
	const view = new DataView(bytes.buffer);
	view.setUint32(0, data.length);
	bytes.set(name, 4);
	bytes.set(data, 8);
	view.setUint32(bytes.length - 4, crc32(bytes.subarray(4, bytes.length - 4)));
	return bytes;
}

/** Builds the 13-byte IHDR payload. */
export function header(
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

/** Wraps PNG bytes in a Blob for the file-based helpers. */
export function pngBlob(bytes: Uint8Array): Blob {
	const buffer = new ArrayBuffer(bytes.byteLength);
	new Uint8Array(buffer).set(bytes);
	return new Blob([buffer], { type: 'image/png' });
}

/** Builds an indexed PNG with optional tRNS alpha and a gAMA chunk. */
export function makeIndexedPng(
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

/** Builds the Adam7-interlaced scanline data for 8-bit RGBA pixels. */
export function makeAdam7RgbaData(width: number, height: number, pixels: number[][]): Uint8Array {
	const bytes: number[] = [];

	for (const pass of ADAM7_PASSES) {
		const passWidth = width <= pass.x ? 0 : Math.ceil((width - pass.x) / pass.dx);
		const passHeight = height <= pass.y ? 0 : Math.ceil((height - pass.y) / pass.dy);
		if (passWidth === 0 || passHeight === 0) continue;

		for (let row = 0; row < passHeight; row++) {
			bytes.push(0);
			for (let column = 0; column < passWidth; column++) {
				const x = pass.x + column * pass.dx;
				const y = pass.y + row * pass.dy;
				bytes.push(...pixels[y * width + x]);
			}
		}
	}

	return new Uint8Array(bytes);
}

/**
 * Builds a valid PNG from raw channel samples, including sub-byte packing,
 * Adam7 scatter, tRNS/PLTE chunks, and forward row filtering.
 */
export function makeSampledPng(options: SampledPngOptions): Uint8Array {
	const {
		width,
		height,
		colorType,
		bitDepth,
		pixels,
		interlace = 0,
		filter = 0,
		plte,
		trns
	} = options;

	if (pixels.length !== width * height) {
		throw new Error('makeSampledPng: expected one sample entry per pixel position');
	}

	const channels = CHANNELS[colorType];
	if (!channels) throw new Error(`makeSampledPng: unsupported color type ${colorType}`);

	const chunks = [chunk('IHDR', header(width, height, bitDepth, colorType, interlace))];
	if (plte) chunks.push(chunk('PLTE', new Uint8Array(plte.flat())));
	if (trns) chunks.push(chunk('tRNS', new Uint8Array(trns)));

	const scanlines = buildScanlines(width, height, channels, bitDepth, pixels, interlace, filter);
	chunks.push(chunk('IDAT', zlibSync(scanlines)));
	chunks.push(chunk('IEND', new Uint8Array()));

	return makePng(chunks);
}

function buildScanlines(
	width: number,
	height: number,
	channels: number,
	bitDepth: number,
	pixels: number[][],
	interlace: 0 | 1,
	filter: Filter | ((y: number) => number)
): Uint8Array {
	const passes = interlace === 0 ? [{ x: 0, y: 0, dx: 1, dy: 1 }] : ADAM7_PASSES;
	const bytes: number[] = [];

	for (const pass of passes) {
		const passWidth = width <= pass.x ? 0 : Math.ceil((width - pass.x) / pass.dx);
		const passHeight = height <= pass.y ? 0 : Math.ceil((height - pass.y) / pass.dy);
		if (passWidth === 0 || passHeight === 0) continue;

		const rowBytes = Math.ceil((passWidth * channels * bitDepth) / 8);
		const bytesPerPixel = Math.max(1, Math.ceil((channels * bitDepth) / 8));
		let previous = new Uint8Array(rowBytes);

		for (let row = 0; row < passHeight; row++) {
			const samples: number[][] = [];
			for (let column = 0; column < passWidth; column++) {
				const x = pass.x + column * pass.dx;
				const y = pass.y + row * pass.dy;
				samples.push(pixels[y * width + x]);
			}

			const globalY = pass.y + row * pass.dy;
			const filterType = resolveFilter(filter, globalY);
			const raw = packSamples(samples, channels, bitDepth);
			const filtered = filterRow(raw, previous, filterType, bytesPerPixel);

			bytes.push(filterType, ...filtered);
			// PNG filters reference the original bytes of the row above, not its filtered form.
			previous = raw;
		}
	}

	return new Uint8Array(bytes);
}

function resolveFilter(filter: Filter | ((y: number) => number), y: number): Filter {
	const filterType = typeof filter === 'function' ? filter(y) : filter;

	if (!Number.isInteger(filterType) || filterType < 0 || filterType > 4) {
		throw new Error(`makeSampledPng: unsupported row filter ${filterType} for row ${y}`);
	}

	return filterType as Filter;
}

/** Packs channel samples into one scanline, most significant bit first. */
function packSamples(samples: number[][], channels: number, bitDepth: number): Uint8Array<ArrayBuffer> {
	const totalBits = samples.length * channels * bitDepth;
	const row = new Uint8Array(Math.ceil(totalBits / 8));
	let bit = 0;

	for (const pixel of samples) {
		for (let channel = 0; channel < channels; channel++) {
			for (let shift = bitDepth - 1; shift >= 0; shift--) {
				if ((pixel[channel] >> shift) & 1) {
					row[bit >> 3] |= 1 << (7 - (bit & 7));
				}
				bit++;
			}
		}
	}

	return row;
}

/** Applies a PNG row filter in the encoding direction. */
function filterRow(
	raw: Uint8Array,
	previous: Uint8Array,
	filter: Filter,
	bytesPerPixel: number
): Uint8Array {
	const out = new Uint8Array(raw.length);

	for (let index = 0; index < raw.length; index++) {
		const left = index >= bytesPerPixel ? raw[index - bytesPerPixel] : 0;
		const above = previous[index] ?? 0;
		const upperLeft = index >= bytesPerPixel ? (previous[index - bytesPerPixel] ?? 0) : 0;

		switch (filter) {
			case 0:
				out[index] = raw[index];
				break;
			case 1:
				out[index] = (raw[index] - left) & 255;
				break;
			case 2:
				out[index] = (raw[index] - above) & 255;
				break;
			case 3:
				out[index] = (raw[index] - Math.floor((left + above) / 2)) & 255;
				break;
			case 4:
				out[index] = (raw[index] - paethPredictor(left, above, upperLeft)) & 255;
				break;
		}
	}

	return out;
}

function paethPredictor(left: number, above: number, upperLeft: number): number {
	const estimate = left + above - upperLeft;
	const leftDistance = Math.abs(estimate - left);
	const aboveDistance = Math.abs(estimate - above);
	const upperLeftDistance = Math.abs(estimate - upperLeft);

	if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
	return aboveDistance <= upperLeftDistance ? above : upperLeft;
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
