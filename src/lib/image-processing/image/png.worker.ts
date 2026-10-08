/// <reference lib="webworker" />

import { decodePng } from './png.ts';

type DecodeResponse =
	| { width: number; height: number; pixels: ArrayBuffer }
	| { error: string };

self.addEventListener('message', (event: MessageEvent<ArrayBuffer>) => {
	try {
		const decoded = decodePng(new Uint8Array(event.data));
		const pixels = decoded.data.buffer;
		const response: DecodeResponse = {
			width: decoded.width,
			height: decoded.height,
			pixels
		};

		self.postMessage(response, [pixels]);
	} catch (error) {
		const response: DecodeResponse = {
			error: error instanceof Error ? error.message : 'Could not decode PNG image.'
		};

		self.postMessage(response);
	}
});
