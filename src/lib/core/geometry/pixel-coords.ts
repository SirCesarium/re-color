/**
 * Pure coordinate math for fitting an image inside a viewport and mapping
 * pointer positions back to image pixels.
 *
 * These are extracted from PixelCanvas so they can be unit-tested without a
 * DOM: everything here takes plain rectangles and dimensions, never an element.
 */

export type Size = { width: number; height: number };

export type ImageRect = { left: number; top: number; scale: number };

export type ImageTransform = { zoom: number; offsetX: number; offsetY: number };

export const MAX_NATIVE_ZOOM = 32;

function clamp(value: number, min: number, max: number): number {
	const clamped = Math.min(Math.max(value, min), max);

	return clamped === 0 ? 0 : clamped;
}

/**
 * Where the image lands inside a viewport that is larger than it, matching the
 * CSS `object-fit: contain` behavior the preview relies on: the image keeps its
 * aspect ratio, is scaled to fit, and is centered on both axes.
 *
 * @param viewport Size of the container the image is shown in.
 * @param image Intrinsic size of the image.
 * @returns The image's offset from the viewport's top-left corner and its scale.
 */
export function fitImageInViewport(viewport: Size, image: Size): ImageRect {
	const scale = Math.min(viewport.width / image.width, viewport.height / image.height);

	return {
		left: (viewport.width - image.width * scale) / 2,
		top: (viewport.height - image.height * scale) / 2,
		scale
	};
}

export function zoomLimits(
	viewport: Readonly<Size>,
	image: Readonly<Size>
): { min: number; max: number } {
	const fit = fitImageInViewport(viewport, image);

	return { min: fit.scale, max: Math.max(MAX_NATIVE_ZOOM, fit.scale * 2) };
}

export function imageRectFor(
	viewport: Readonly<Size>,
	image: Readonly<Size>,
	transform: Readonly<ImageTransform>
): ImageRect {
	return {
		left: (viewport.width - image.width * transform.zoom) / 2 + transform.offsetX,
		top: (viewport.height - image.height * transform.zoom) / 2 + transform.offsetY,
		scale: transform.zoom
	};
}

export function clampImageTransform(
	viewport: Readonly<Size>,
	image: Readonly<Size>,
	transform: Readonly<ImageTransform>
): ImageTransform {
	const scaledWidth = image.width * transform.zoom;
	const scaledHeight = image.height * transform.zoom;
	const maxX = Math.max(0, (scaledWidth - viewport.width) / 2);
	const maxY = Math.max(0, (scaledHeight - viewport.height) / 2);

	return {
		zoom: transform.zoom,
		offsetX: clamp(transform.offsetX, -maxX, maxX),
		offsetY: clamp(transform.offsetY, -maxY, maxY)
	};
}

export function zoomImageAtPoint(
	viewport: Readonly<Size>,
	image: Readonly<Size>,
	transform: Readonly<ImageTransform>,
	point: Readonly<{ x: number; y: number }>,
	nextZoom: number
): ImageTransform {
	const current = imageRectFor(viewport, image, transform);
	const imageX = (point.x - current.left) / current.scale;
	const imageY = (point.y - current.top) / current.scale;
	const nextLeft = point.x - imageX * nextZoom;
	const nextTop = point.y - imageY * nextZoom;

	return clampImageTransform(viewport, image, {
		zoom: nextZoom,
		offsetX: nextLeft - (viewport.width - image.width * nextZoom) / 2,
		offsetY: nextTop - (viewport.height - image.height * nextZoom) / 2
	});
}

/**
 * Maps a pointer position (in client coordinates) to the image pixel under it.
 *
 * @param point The pointer position in client coordinates.
 * @param viewportOffset The viewport's own offset within the client area.
 * @param rect Where the image sits inside the viewport, from {@link fitImageInViewport}.
 * @param image Size of the image being pointed at.
 * @returns The pixel's grid position and linear index, or `null` when the pointer is outside the image.
 */
export function pixelAtPoint(
	point: { x: number; y: number },
	viewportOffset: { left: number; top: number },
	rect: ImageRect,
	image: Size
): { x: number; y: number; index: number } | null {
	if (rect.scale <= 0) return null;

	const x = Math.floor((point.x - viewportOffset.left - rect.left) / rect.scale);
	const y = Math.floor((point.y - viewportOffset.top - rect.top) / rect.scale);

	if (x < 0 || y < 0 || x >= image.width || y >= image.height) return null;

	return { x, y, index: y * image.width + x };
}
