import { decodePng, isPng } from './png.ts';
import { validateImageFile } from './validation.ts';

/** A decoded image source together with its intrinsic dimensions and cleanup callback. */
export type LoadedImage = {
	/** Drawable source accepted by `CanvasRenderingContext2D.drawImage`. */
	source?: CanvasImageSource;
	/** Intrinsic width in pixels. */
	width: number;
	/** Intrinsic height in pixels. */
	height: number;
	/** Original decoded PNG samples, avoiding browser color-profile conversion. */
	pixels?: Uint8ClampedArray<ArrayBuffer>;
	/** Releases resources allocated while decoding the image. */
	close: () => void;
};

/** Browser canvas options used when reading or writing pixels. */
export type CanvasConfig = {
	/** Whether the context is expected to be read frequently. */
	willReadFrequently: boolean;
	/** Color space used for the canvas bitmap. */
	colorSpace: PredefinedColorSpace;
};

/**
 * Decodes PNG samples directly and other supported formats through browser image APIs.
 *
 * @param file Image file to decode.
 * @returns The decoded image dimensions and a callback that releases its resources.
 * @throws If PNG data is invalid or decoding fails.
 */
export async function loadImage(file: Blob): Promise<LoadedImage> {
	const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());

	if (isPng(signature)) {
		const decoded = decodePng(new Uint8Array(await file.arrayBuffer()));

		return {
			width: decoded.width,
			height: decoded.height,
			pixels: decoded.data,
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
			// Fall back to an image element when bitmap decoding is unavailable.
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

/**
 * Rebuilds an output image by copying excluded pixels from the original sprite.
 *
 * This does not run color mapping; it only composes the already-recolored image
 * with the original pixels selected by the mask.
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

	const [base, original] = await Promise.all([
		loadImage(await response.blob()),
		loadImage(originalFile)
	]);

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
		base.close();
		original.close();
	}
}

/**
 * Creates an HTML canvas with the requested pixel dimensions.
 *
 * @param width Canvas width in pixels.
 * @param height Canvas height in pixels.
 * @returns A newly created, unattached canvas.
 */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
	const canvas = document.createElement('canvas');

	canvas.width = width;
	canvas.height = height;

	return canvas;
}

/**
 * Gets a 2D rendering context configured for pixel access.
 *
 * @param canvas Canvas whose context is requested.
 * @param config Read-frequency and color-space options.
 * @returns The canvas 2D context.
 * @throws If the browser cannot create a 2D context with the supplied options.
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
 * Draws a decoded image to a temporary canvas and reads its pixel data.
 *
 * @param image Decoded image source and dimensions.
 * @param config Canvas settings used for drawing and reading pixels.
 * @returns Image data with four RGBA channel bytes per pixel.
 * @throws If canvas creation, drawing, or pixel access fails.
 */
export function readPixels(image: LoadedImage, config: CanvasConfig): ImageData {
	if (image.pixels) return new ImageData(image.pixels, image.width, image.height);
	if (!image.source) throw new Error('Decoded image does not have a readable source');

	const context = context2d(createCanvas(image.width, image.height), config);

	context.drawImage(image.source, 0, 0);

	return context.getImageData(0, 0, image.width, image.height);
}

/**
 * Encodes a canvas and returns an object URL for the resulting blob.
 *
 * @param canvas Canvas to encode.
 * @param config Requested MIME type and optional lossy-encoder quality.
 * @returns An object URL whose blob type matches the requested MIME type.
 * @throws If encoding fails or the browser returns a different MIME type.
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
					reject(
						new Error(`Image encoder returned ${blob.type} instead of ${config.mimeType}`)
					);

					return;
				}

				resolve(URL.createObjectURL(blob));
			},
			config.mimeType,
			config.quality
		);
	});
}
