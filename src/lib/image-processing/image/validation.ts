import { LocalizedError } from '../../i18n/localized-error.ts';

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const IHDR_TYPE = [73, 72, 68, 82];

export const MAX_IMAGE_WIDTH = 512;
export const MAX_IMAGE_HEIGHT = 512;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/**
 * Validates the upload constraints using the file contents rather than its
 * extension or browser-reported MIME type.
 *
 * @throws If the file is too large, is not a PNG, or exceeds the pixel dimensions.
 */
export async function validateImageFile(file: Blob): Promise<void> {
	if (file.size > MAX_IMAGE_BYTES) {
		throw new LocalizedError('validation.tooLarge');
	}

	const header = new Uint8Array(await file.slice(0, 24).arrayBuffer());

	if (
		header.length < 24 ||
		!PNG_SIGNATURE.every((byte, index) => header[index] === byte) ||
		header[8] !== 0 ||
		header[9] !== 0 ||
		header[10] !== 0 ||
		header[11] !== 13 ||
		!IHDR_TYPE.every((byte, index) => header[12 + index] === byte)
	) {
		throw new LocalizedError('validation.notPng');
	}

	const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
	const width = view.getUint32(16);
	const height = view.getUint32(20);

	if (width === 0 || height === 0) {
		throw new LocalizedError('validation.empty');
	}

	if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
		throw new LocalizedError('validation.tooBig');
	}
}
