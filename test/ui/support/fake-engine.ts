import { vi } from 'vitest';
import { fakeObjectUrl } from './object-urls.ts';

/**
 * Controllable stand-ins for the image-processing engine. The real functions
 * paint pixels on a canvas, which jsdom cannot do; these let a test drive when
 * each promise resolves so interleaving and cancellation can be exercised
 * deterministically. URLs are produced through the tracked createObjectURL so
 * the workflow's release logic can be asserted.
 */
export const recolorSprite = vi.fn(async () => fakeObjectUrl());

export const extractColorsFromFile = vi.fn(async () => [{ r: 10, g: 20, b: 30, active: true }]);

export const composeExcludedPixels = vi.fn(async (previewUrl: string) => previewUrl);

/** The fake engine runs to completion without ever yielding to the browser. */
export function yieldToBrowser(): Promise<void> {
	return Promise.resolve();
}

export function resetFakeEngine(): void {
	recolorSprite.mockReset();
	extractColorsFromFile.mockReset();
	composeExcludedPixels.mockReset();

	recolorSprite.mockImplementation(async () => fakeObjectUrl());
	extractColorsFromFile.mockImplementation(async () => [{ r: 10, g: 20, b: 30, active: true }]);
	composeExcludedPixels.mockImplementation(async (previewUrl: string) => previewUrl);
}

/** A promise whose resolution the test controls by hand. */
export function deferred<T>(): {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason: unknown) => void;
} {
	let resolve!: (value: T) => void;
	let reject!: (reason: unknown) => void;

	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, resolve, reject };
}
