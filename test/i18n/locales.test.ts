import { expect, test } from 'bun:test';
import en from '../../src/lib/i18n/messages/en.json';
import es from '../../src/lib/i18n/messages/es.json';

const english = en as Record<string, string>;
const spanish = es as Record<string, string>;

const placeholders = (message: string) =>
	[...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

test('Spanish defines exactly the same keys as English', () => {
	expect(Object.keys(spanish).sort()).toEqual(Object.keys(english).sort());
});

test('no translation is empty', () => {
	for (const [key, message] of Object.entries(spanish)) {
		expect(message, `es:${key}`).not.toBe('');
	}
});

test('translations keep the same placeholders as English', () => {
	for (const [key, message] of Object.entries(english)) {
		expect(placeholders(spanish[key]), `es:${key}`).toEqual(placeholders(message));
	}
});
