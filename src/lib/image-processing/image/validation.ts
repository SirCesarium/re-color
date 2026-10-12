const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const IHDR_TYPE = [73, 72, 68, 82];

export const MAX_IMAGE_WIDTH = 512;
export const MAX_IMAGE_HEIGHT = 512;
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Why an upload was rejected. The app layer turns codes into messages. */
export type ValidationCode = 'tooLarge' | 'notPng' | 'empty' | 'tooBig';

/**
 * The domain's rejection. Carries a plain code — never a display string or an
 * i18n key — so this layer stays independent of how the app words errors.
 */
export class ValidationError extends Error {
	readonly code: ValidationCode;

	constructor(code: ValidationCode) {
		super(code);
		this.name = 'ValidationError';
		this.code = code;
	}
}

/**
 * Enforces the upload limits: 2 MiB, PNG only, up to 512×512.
 *
 * The check reads the file's actual bytes instead of trusting its name or the
 * MIME type the browser reports, both of which are trivially wrong.
 *
 * @throws {ValidationError} When the file is too large, not a PNG, empty, or too big.
 */
export async function validateImageFile(file: Blob): Promise<void> {
	if (file.size > MAX_IMAGE_BYTES) {
		throw new ValidationError('tooLarge');
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
		throw new ValidationError('notPng');
	}

	const view = new DataView(
		header.buffer,
		header.byteOffset,
		header.byteLength
	);
	const width = view.getUint32(16);
	const height = view.getUint32(20);

	if (width === 0 || height === 0) {
		throw new ValidationError('empty');
	}

	if (width > MAX_IMAGE_WIDTH || height > MAX_IMAGE_HEIGHT) {
		throw new ValidationError('tooBig');
	}
}
