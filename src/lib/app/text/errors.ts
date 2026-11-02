import type { MessageKey, MessageValues } from './index.ts';

export class MessageError extends Error {
	readonly messageId: MessageKey;
	readonly values?: MessageValues;

	constructor(messageId: MessageKey, values?: MessageValues) {
		super(messageId);
		this.name = 'MessageError';
		this.messageId = messageId;
		this.values = values;
	}
}
