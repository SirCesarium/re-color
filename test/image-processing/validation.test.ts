import { expect, test } from 'bun:test';
import {
	MAX_IMAGE_BYTES,
	validateImageFile
} from '../../src/lib/image-processing/image/validation.ts';
import { makeIndexedPng, makePng, chunk, header, pngBlob } from '../support/png-fixtures.ts';

test('rejects an empty upload', async () => {
	await expect(validateImageFile(new Blob([], { type: 'image/png' }))).rejects.toThrow(
		'validation.notPng'
	);
});

test('rejects blobs that cannot hold a signature and an IHDR header', async () => {
	// 23 bytes: one short of the 24 bytes the validator reads.
	await expect(validateImageFile(new Blob([new Uint8Array(23)]))).rejects.toThrow(
		'validation.notPng'
	);

	// Exactly 24 bytes but without the PNG signature.
	await expect(validateImageFile(new Blob([new Uint8Array(24)]))).rejects.toThrow(
		'validation.notPng'
	);
});

test('rejects a valid signature whose IHDR does not start at byte 12', async () => {
	const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
	const view = new Uint8Array(24);
	view.set(signature, 0);
	// Bytes 8-11 declare a 13-byte chunk, but the type is not IHDR.
	view.set([0, 0, 0, 13], 8);
	view.set([73, 72, 68, 83], 12);

	await expect(validateImageFile(new Blob([view]))).rejects.toThrow('validation.notPng');
});

test('rejects an IHDR whose declared length is not 13', async () => {
	const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
	const view = new Uint8Array(24);
	view.set(signature, 0);
	view.set([0, 0, 0, 12], 8);
	view.set([73, 72, 68, 82], 12);

	await expect(validateImageFile(new Blob([view]))).rejects.toThrow('validation.notPng');
});

test('accepts a file of exactly 2 MiB when its header is valid', async () => {
	const body = new Uint8Array(MAX_IMAGE_BYTES);
	const png = makeIndexedPng(1, 1, [[20, 40, 60]], [0], [255]);
	body.set(png.subarray(0, Math.min(png.length, body.length)), 0);

	await expect(validateImageFile(new Blob([body]))).resolves.toBeUndefined();
});

test('rejects a 2 MiB file plus one byte', async () => {
	const body = new Uint8Array(MAX_IMAGE_BYTES + 1);
	const png = makeIndexedPng(1, 1, [[20, 40, 60]], [0], [255]);
	body.set(png.subarray(0, Math.min(png.length, body.length)), 0);

	await expect(validateImageFile(new Blob([body]))).rejects.toThrow('validation.tooLarge');
});

test('reports zero dimensions with the dimensions message', async () => {
	// Known wart: a 0 × 0 PNG is rejected as "too big" even though it is empty.
	const png = makePng([
		chunk('IHDR', header(0, 0, 8, 6, 0)),
		chunk('IEND', new Uint8Array())
	]);

	await expect(validateImageFile(pngBlob(png))).rejects.toThrow('validation.tooBig');
});

test('accepts the largest supported dimensions', async () => {
	const png = makeIndexedPng(512, 512, [[20, 40, 60]], Array(512 * 512).fill(0), [255]);

	await expect(validateImageFile(pngBlob(png))).resolves.toBeUndefined();
});
