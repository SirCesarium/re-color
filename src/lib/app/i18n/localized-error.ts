import type { MessageKey } from './locales.ts';

/** An error that carries a message key instead of a display string. */
export class LocalizedError extends Error {
	readonly messageId: MessageKey;
	readonly values?: Record<string, string | number>;

	constructor(messageId: MessageKey, values?: Record<string, string | number>) {
		super(messageId);
		this.name = 'LocalizedError';
		this.messageId = messageId;
		this.values = values;
	}
}
