import { describe, expect, test } from 'vitest';
import {
	clampImageTransform,
	fitImageInViewport,
	imageRectFor,
	MAX_NATIVE_ZOOM,
	pixelAtPoint,
	zoomImageAtPoint,
	zoomLimits
} from '../../../src/lib/core/geometry/pixel-coords.ts';

describe('fitImageInViewport', () => {
	test('scales to the limiting axis and centers on both', () => {
		// A 100x50 image inside a 200x200 viewport: width limits (scale 2), so
		// the leftover vertical space is split evenly as top/bottom bars.
		const rect = fitImageInViewport({ width: 200, height: 200 }, { width: 100, height: 50 });

		expect(rect.scale).toBe(2);
		expect(rect.left).toBe(0);
		expect(rect.top).toBe(50);
	});

	test('a portrait image centers horizontally instead', () => {
		const rect = fitImageInViewport({ width: 200, height: 200 }, { width: 50, height: 100 });

		expect(rect.scale).toBe(2);
		expect(rect.left).toBe(50);
		expect(rect.top).toBe(0);
	});

	test('an exact fit leaves no offset', () => {
		const rect = fitImageInViewport({ width: 64, height: 64 }, { width: 64, height: 64 });

		expect(rect.scale).toBe(1);
		expect(rect.left).toBe(0);
		expect(rect.top).toBe(0);
	});
});

describe('pixelAtPoint', () => {
	const image = { width: 8, height: 8 };
	const offset = { left: 0, top: 0 };

	test('the first client pixel maps to the top-left image pixel', () => {
		const rect = { left: 0, top: 0, scale: 10 };

		expect(pixelAtPoint({ x: 0, y: 0 }, offset, rect, image)).toEqual({
			x: 0,
			y: 0,
			index: 0
		});
	});

	test('a scaled image maps client coordinates into the right cell', () => {
		// Each image pixel is 10x10 client pixels, so (25, 15) lands on (2, 1).
		const rect = { left: 0, top: 0, scale: 10 };

		expect(pixelAtPoint({ x: 25, y: 15 }, offset, rect, image)).toEqual({
			x: 2,
			y: 1,
			index: 10
		});
	});

	test('a centered image accounts for its offset', () => {
		// The image is inset 4px left / 4px top within the viewport.
		const rect = { left: 4, top: 4, scale: 10 };

		expect(pixelAtPoint({ x: 4, y: 4 }, offset, rect, image)).toEqual({
			x: 0,
			y: 0,
			index: 0
		});
	});

	test('the viewport offset shifts the result', () => {
		const rect = { left: 0, top: 0, scale: 10 };

		expect(pixelAtPoint({ x: 30, y: 20 }, { left: 10, top: 10 }, rect, image)).toEqual({
			x: 2,
			y: 1,
			index: 10
		});
	});

	test('pointing past any edge returns null', () => {
		const rect = { left: 0, top: 0, scale: 10 };

		expect(pixelAtPoint({ x: -1, y: 0 }, offset, rect, image)).toBeNull();
		expect(pixelAtPoint({ x: 0, y: -1 }, offset, rect, image)).toBeNull();
		expect(pixelAtPoint({ x: 80, y: 0 }, offset, rect, image)).toBeNull();
		expect(pixelAtPoint({ x: 0, y: 80 }, offset, rect, image)).toBeNull();
	});

	test('a zero scale cannot map anything', () => {
		const rect = { left: 0, top: 0, scale: 0 };

		expect(pixelAtPoint({ x: 0, y: 0 }, offset, rect, image)).toBeNull();
	});
});

describe('zoomLimits', () => {
	test('starts at the fit scale and caps large images at the native maximum', () => {
		const limits = zoomLimits({ width: 200, height: 200 }, { width: 512, height: 512 });

		expect(limits.min).toBeCloseTo(200 / 512);
		expect(limits.max).toBe(MAX_NATIVE_ZOOM);
	});

	test('small images can zoom to twice their fit scale', () => {
		const limits = zoomLimits({ width: 200, height: 200 }, { width: 8, height: 8 });

		expect(limits.min).toBe(25);
		expect(limits.max).toBe(50);
	});
});

describe('imageRectFor', () => {
	test('centers the scaled image and applies the offset', () => {
		const rect = imageRectFor(
			{ width: 200, height: 100 },
			{ width: 10, height: 10 },
			{ zoom: 4, offsetX: 6, offsetY: -2 }
		);

		expect(rect).toEqual({ left: 86, top: 28, scale: 4 });
	});
});

describe('clampImageTransform', () => {
	test('centers an image smaller than the viewport', () => {
		const clamped = clampImageTransform(
			{ width: 200, height: 200 },
			{ width: 10, height: 10 },
			{ zoom: 4, offsetX: 30, offsetY: -30 }
		);

		expect(clamped).toEqual({ zoom: 4, offsetX: 0, offsetY: 0 });
	});

	test('stops a zoomed image at the viewport edges', () => {
		const clamped = clampImageTransform(
			{ width: 100, height: 100 },
			{ width: 10, height: 10 },
			{ zoom: 20, offsetX: 500, offsetY: -500 }
		);

		expect(clamped.offsetX).toBe(50);
		expect(clamped.offsetY).toBe(-50);
	});
});

describe('zoomImageAtPoint', () => {
	test('keeps the image point under the cursor fixed', () => {
		const viewport = { width: 100, height: 100 };
		const image = { width: 10, height: 10 };
		const before = { zoom: 10, offsetX: 0, offsetY: 0 };
		const point = { x: 30, y: 70 };
		const after = zoomImageAtPoint(viewport, image, before, point, 20);
		const beforeRect = imageRectFor(viewport, image, before);
		const afterRect = imageRectFor(viewport, image, after);
		const imageX = (point.x - beforeRect.left) / beforeRect.scale;
		const imageY = (point.y - beforeRect.top) / beforeRect.scale;

		expect(afterRect.left + imageX * afterRect.scale).toBeCloseTo(point.x);
		expect(afterRect.top + imageY * afterRect.scale).toBeCloseTo(point.y);
	});

	test('clamps the offset when the cursor sits on an edge', () => {
		const after = zoomImageAtPoint(
			{ width: 100, height: 100 },
			{ width: 10, height: 10 },
			{ zoom: 10, offsetX: 0, offsetY: 0 },
			{ x: 100, y: 100 },
			20
		);

		expect(after.offsetX).toBe(-50);
		expect(after.offsetY).toBe(-50);
	});
});
