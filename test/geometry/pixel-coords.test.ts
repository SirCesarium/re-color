import { describe, expect, test } from 'bun:test';
import {
	fitImageInViewport,
	pixelAtPoint
} from '../../src/lib/core/geometry/pixel-coords.ts';

describe('fitImageInViewport', () => {
	test('scales to the limiting axis and centers on both', () => {
		// A 100x50 image inside a 200x200 viewport: width limits (scale 2), so
		// the leftover vertical space is split evenly as top/bottom bars.
		const rect = fitImageInViewport(
			{ width: 200, height: 200 },
			{ width: 100, height: 50 }
		);

		expect(rect.scale).toBe(2);
		expect(rect.left).toBe(0);
		expect(rect.top).toBe(50);
	});

	test('a portrait image centers horizontally instead', () => {
		const rect = fitImageInViewport(
			{ width: 200, height: 200 },
			{ width: 50, height: 100 }
		);

		expect(rect.scale).toBe(2);
		expect(rect.left).toBe(50);
		expect(rect.top).toBe(0);
	});

	test('an exact fit leaves no offset', () => {
		const rect = fitImageInViewport(
			{ width: 64, height: 64 },
			{ width: 64, height: 64 }
		);

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

		expect(
			pixelAtPoint({ x: 30, y: 20 }, { left: 10, top: 10 }, rect, image)
		).toEqual({
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
