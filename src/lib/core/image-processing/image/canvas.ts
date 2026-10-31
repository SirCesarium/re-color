import { decodePng, isPng } from './png.ts';
import { validateImageFile } from './validation.ts';

/**
 * A decoded image plus everything needed to draw or read it back.
 *
 * PNGs arrive as raw samples (see {@link loadImage}); other formats arrive as a
 * drawable source the browser gave us.
 */
export type LoadedImage = {
	/** What `drawImage` accepts; absent when we already hold raw samples. */
	source?: CanvasImageSource;
	/** Width in pixels. */
	width: number;
	/** Height in pixels. */
	height: number;
	/** Raw RGBA samples straight from the PNG file, with no browser color conversion applied. */
	pixels?: Uint8ClampedArray<ArrayBuffer>;
	/** Frees whatever the decoder held on to (bitmap, object URL, ...). */
	close: () => void;
};

/** The two canvas options that matter for pixel work. */
export type CanvasConfig = {
	/** True when we read pixels back often; the browser can then skip the GPU copy. */
	willReadFrequently: boolean;
	/** Color space for the canvas bitmap. */
	colorSpace: PredefinedColorSpace;
};

/**
 * Decodes a file into pixels we can read back.
 *
 * PNGs go through our own decoder (in a worker when available) so their samples
 * stay untouched by browser color management. Everything else uses
 * `createImageBitmap`, falling back to an `<img>` element when that fails.
 *
 * @param file Image file to decode.
 * @returns The decoded dimensions, the pixels or drawable source, and a `close()` that releases them.
 * @throws If the PNG data is invalid or the browser cannot decode the file.
 */
export async function loadImage(file: Blob): Promise<LoadedImage> {
	const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());

	if (isPng(signature)) {
		const pixels = await decodePngInWorker(await file.arrayBuffer());

		return {
			width: pixels.width,
			height: pixels.height,
			pixels: new Uint8ClampedArray(pixels.data),
			close: () => {}
		};
	}

	if (typeof createImageBitmap === 'function') {
		try {
			const bitmap = await createImageBitmap(file);

			return {
				source: bitmap,
				width: bitmap.width,
				height: bitmap.height,
				close: () => bitmap.close()
			};
		} catch {
			// The browser has createImageBitmap but still refused this file; try the <img> path.
		}
	}

	const url = URL.createObjectURL(file);

	try {
		const image = new Image();

		image.src = url;

		await image.decode();

		return {
			source: image,
			width: image.naturalWidth,
			height: image.naturalHeight,
			close: () => URL.revokeObjectURL(url)
		};
	} catch (error) {
		URL.revokeObjectURL(url);
		throw error;
	}
}

function decodePngInWorker(
	data: ArrayBuffer
): Promise<{ width: number; height: number; data: ArrayBuffer }> {
	if (typeof Worker === 'undefined') {
		const decoded = decodePng(new Uint8Array(data));
		return Promise.resolve({
			width: decoded.width,
			height: decoded.height,
			data: decoded.data.buffer
		});
	}

	return new Promise((resolve, reject) => {
		const worker = new Worker(new URL('./png.worker.ts', import.meta.url), {
			type: 'module'
		});

		worker.addEventListener(
			'message',
			(
				event: MessageEvent<{
					width?: number;
					height?: number;
					pixels?: ArrayBuffer;
					error?: string;
				}>
			) => {
				worker.terminate();

				if (event.data.error) {
					reject(new Error(event.data.error));
					return;
				}

				if (
					event.data.width === undefined ||
					event.data.height === undefined ||
					!event.data.pixels
				) {
					reject(new Error('PNG decoder returned an invalid response'));
					return;
				}

				resolve({
					width: event.data.width,
					height: event.data.height,
					data: event.data.pixels
				});
			},
			{ once: true }
		);
		worker.addEventListener(
			'error',
			(event) => {
				worker.terminate();
				reject(new Error(`PNG decoder worker failed: ${event.message}`));
			},
			{ once: true }
		);
		worker.postMessage(data, [data]);
	});
}

/**
 * Paints the excluded pixels of the original sprite back over an already
 * recolored image.
 *
 * No mapping happens here; it is a straight copy of the masked pixels, which is
 * why both images must be the same size.
 */
export async function composeExcludedPixels(
	baseUrl: string,
	originalFile: Blob,
	excludedPixels: ReadonlySet<number>,
	canvasConfig: CanvasConfig,
	outputConfig: { mimeType: string; quality?: number }
): Promise<string> {
	await validateImageFile(originalFile);
	const response = await fetch(baseUrl);

	if (!response.ok) throw new Error(`Could not read the recolored image: ${response.status}`);

	const base = await loadImage(await response.blob());

	try {
		const original = await loadImage(originalFile);

		try {
			if (base.width !== original.width || base.height !== original.height) {
				throw new Error('Original and recolored image dimensions do not match');
			}

			const outputPixels = readPixels(base, canvasConfig);
			const originalPixels = readPixels(original, canvasConfig);
			const pixelCount = base.width * base.height;

			for (const pixelIndex of excludedPixels) {
				if (!Number.isInteger(pixelIndex) || pixelIndex < 0 || pixelIndex >= pixelCount) {
					throw new RangeError(`excludedPixels contains an invalid pixel index: ${pixelIndex}`);
				}

				const channelIndex = pixelIndex * 4;
				outputPixels.data.set(
					originalPixels.data.subarray(channelIndex, channelIndex + 4),
					channelIndex
				);
			}

			const surface = createCanvas(base.width, base.height);
			const context = context2d(surface, canvasConfig);
			context.putImageData(outputPixels, 0, 0);

			return await toBlobUrl(surface, outputConfig);
		} finally {
			original.close();
		}
	} finally {
		base.close();
	}
}

/**
 * Creates a detached canvas of the requested pixel size. Nothing is inserted
 * into the document, so there is no layout cost while it is painted into.
 *
 * @param width Width in pixels.
 * @param height Height in pixels.
 * @returns The new canvas.
 */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas');

	canvas.width = width;
	canvas.height = height;

	return canvas;
}

/**
 * A 2D context wired for pixel work: smoothing and filters are switched off so
 * the browser never resamples or recolors the sprite behind our back. The
 * color space and read-frequency hints come from `config`.
 *
 * @param canvas Canvas to get the context from.
 * @param config Color-space and `willReadFrequently` hints.
 * @returns The configured 2D context.
 * @throws If the browser refuses to create one with the supplied options.
 */
export function context2d(
	canvas: HTMLCanvasElement,
	config: CanvasConfig
): CanvasRenderingContext2D {
	const context = canvas.getContext('2d', {
		willReadFrequently: config.willReadFrequently,
		colorSpace: config.colorSpace
	});

	if (!context) throw new Error('Canvas 2D context is not available');

	context.imageSmoothingEnabled = false;
	context.filter = 'none';

	return context;
}

/**
 * Reads an image's pixels as RGBA `ImageData`.
 *
 * Raw PNG samples are used as-is when present; only images decoded through the
 * browser APIs need the temporary draw-and-read round trip.
 *
 * @param image Decoded image to read.
 * @param config Canvas settings for the draw round trip.
 * @returns Four RGBA bytes per pixel.
 * @throws If the image has neither samples nor a drawable source, or the canvas fails.
 */
export function readPixels(image: LoadedImage, config: CanvasConfig): ImageData {
	if (image.pixels) return new ImageData(image.pixels, image.width, image.height);
	if (!image.source) throw new Error('Decoded image does not have a readable source');

	const context = context2d(createCanvas(image.width, image.height), config);

	context.drawImage(image.source, 0, 0);

	return context.getImageData(0, 0, image.width, image.height);
}

/**
 * Encodes the canvas and hands back an object URL for the result.
 *
 * The blob's type is checked against the request: some browsers answer with a
 * PNG (or nothing at all) when they do not support the requested format, and a
 * silent downgrade would break both the download and its file extension.
 *
 * @param canvas Canvas to encode.
 * @param config MIME type, plus quality for the lossy formats.
 * @returns An object URL; the caller is responsible for revoking it.
 * @throws If encoding fails or comes back in the wrong format.
 */
export function toBlobUrl(
	canvas: HTMLCanvasElement,
	config: { mimeType: string; quality?: number }
): Promise<string> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error(`Could not encode the image as ${config.mimeType}`));

					return;
				}

				if (blob.type !== config.mimeType) {
					reject(new Error(`Image encoder returned ${blob.type} instead of ${config.mimeType}`));

					return;
				}

				resolve(URL.createObjectURL(blob));
			},
			config.mimeType,
			config.quality
		);
	});
}
