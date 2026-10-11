import { zlibSync } from 'fflate';
import { decodePng } from '../../src/lib/image-processing/image/png.ts';
import { chunk, header, makePng } from './png-fixtures.ts';

/**
 * Minimal canvas doubles for running the browser-only image pipeline under bun.
 *
 * The engine only needs four canvas capabilities on its happy path: creating a
 * canvas, receiving pixels with `putImageData`, reading them back with
 * `getImageData`, and encoding them with `toBlob`. The fake encodes a real
 * RGBA PNG so results stay verifiable through the project's own decoder.
 */

/** Encodes straight RGBA samples as an 8-bit truecolor PNG with no row filters. */
export function encodeRgbaPng(
	width: number,
	height: number,
	rgba: Uint8ClampedArray | Uint8Array
): Uint8Array {
	if (rgba.length !== width * height * 4) {
		throw new Error(
			`encodeRgbaPng: expected ${width * height * 4} bytes for ${width}×${height}, got ${rgba.length}`
		);
	}

	const rows = new Uint8Array(height * (width * 4 + 1));

	for (let y = 0; y < height; y++) {
		const offset = y * (width * 4 + 1);
		rows[offset] = 0;
		rows.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), offset + 1);
	}

	return makePng([
		chunk('IHDR', header(width, height, 8, 6, 0)),
		chunk('IDAT', zlibSync(rows)),
		chunk('IEND', new Uint8Array())
	]);
}

/** Builds RGBA samples for a grid from a pixel color callback. */
export function rgbaPixels(
	width: number,
	height: number,
	colorAt: (x: number, y: number) => readonly [number, number, number, number]
): Uint8ClampedArray {
	const data = new Uint8ClampedArray(width * height * 4);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const [r, g, b, a] = colorAt(x, y);
			const index = (y * width + x) * 4;
			data[index] = r;
			data[index + 1] = g;
			data[index + 2] = b;
			data[index + 3] = a;
		}
	}

	return data;
}

/** Wraps RGBA samples in a valid PNG `File`, like a real upload. */
export function rgbaFile(
	width: number,
	height: number,
	rgba: Uint8ClampedArray | Uint8Array,
	name = 'sprite.png'
): File {
	return new File([encodeRgbaPng(width, height, rgba)], name, { type: 'image/png' });
}

/** Collects the pixels behind an object URL by decoding its PNG payload. */
export async function readObjectUrlPixels(
	url: string
): Promise<{ width: number; height: number; data: number[] }> {
	const response = await fetch(url);

	if (!response.ok) throw new Error(`readObjectUrlPixels: could not read ${url}`);

	const decoded = decodePng(new Uint8Array(await response.arrayBuffer()));

	return { width: decoded.width, height: decoded.height, data: [...decoded.data] };
}

/** Stands in for the `ImageData` constructor, which bun does not provide. */
export class FakeImageData {
	readonly data: Uint8ClampedArray;
	readonly width: number;
	readonly height: number;

	constructor(data: Uint8ClampedArray, width: number, height: number) {
		if (data.length !== width * height * 4) {
			throw new RangeError(
				`FakeImageData: ${data.length} bytes do not describe a ${width}×${height} image`
			);
		}

		this.data = data;
		this.width = width;
		this.height = height;
	}
}

type Frame = { data: Uint8ClampedArray; width: number; height: number };

class FakeCanvasContext {
	imageSmoothingEnabled = true;
	filter = 'none';
	#frame: Frame | null = null;

	putImageData(imageData: FakeImageData, dx = 0, dy = 0): void {
		if (dx !== 0 || dy !== 0) {
			throw new Error('FakeCanvasContext: only full-frame putImageData is supported');
		}

		this.#frame = {
			data: new Uint8ClampedArray(imageData.data),
			width: imageData.width,
			height: imageData.height
		};
	}

	getImageData(sx: number, sy: number, sw: number, sh: number): FakeImageData {
		if (sx !== 0 || sy !== 0 || !this.#frame) {
			throw new Error('FakeCanvasContext: getImageData requires a full-frame putImageData first');
		}
		if (sw !== this.#frame.width || sh !== this.#frame.height) {
			throw new Error('FakeCanvasContext: only the full frame can be read back');
		}

		return new FakeImageData(new Uint8ClampedArray(this.#frame.data), sw, sh);
	}

	drawImage(): never {
		throw new Error('FakeCanvasContext: drawImage is not supported; decode PNG files instead');
	}

	/** Encodes the stored frame as a real PNG blob, like the browser encoder. */
	toBlob(
		callback: (blob: Blob | null) => void,
		type = 'image/png',
		_quality?: number
	): void {
		if (type !== 'image/png') {
			callback(null);

			return;
		}

		const width = this.#frame?.width ?? 0;
		const height = this.#frame?.height ?? 0;
		const rgba = this.#frame?.data ?? new Uint8ClampedArray(0);

		callback(new Blob([encodeRgbaPng(width, height, rgba)], { type: 'image/png' }));
	}
}

class FakeCanvas {
	width = 0;
	height = 0;
	readonly #context = new FakeCanvasContext();

	getContext(type: string): FakeCanvasContext | null {
		return type === '2d' ? this.#context : null;
	}

	toBlob(
		callback: (blob: Blob | null) => void,
		type?: string,
		quality?: number
	): void {
		this.#context.toBlob(callback, type, quality);
	}
}

/**
 * Provides `document.createElement('canvas')` and `ImageData` while bun lacks them.
 *
 * @returns A callback that restores the previous globals.
 */
export function installFakeCanvas(): () => void {
	const globals = globalThis as Record<string, unknown>;
	const previousDocument = globals.document;
	const previousImageData = globals.ImageData;

	if (previousImageData === undefined) globals.ImageData = FakeImageData;

	if (previousDocument === undefined) {
		globals.document = {
			createElement(tag: string): FakeCanvas {
				if (tag !== 'canvas') throw new Error(`installFakeCanvas: unsupported element <${tag}>`);

				return new FakeCanvas();
			}
		};
	}

	return () => {
		if (previousDocument === undefined) {
			delete globals.document;
		} else {
			globals.document = previousDocument;
		}

		if (previousImageData === undefined) {
			delete globals.ImageData;
		} else {
			globals.ImageData = previousImageData;
		}
	};
}
