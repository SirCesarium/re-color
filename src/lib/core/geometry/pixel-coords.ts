/**
 * Pure coordinate math for fitting an image inside a viewport and mapping
 * pointer positions back to image pixels.
 *
 * These are extracted from PixelCanvas so they can be unit-tested without a
 * DOM: everything here takes plain rectangles and dimensions, never an element.
 */

export type Size = { width: number; height: number };

export type ImageRect = { left: number; top: number; scale: number };

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
