import messages from './messages.json';

export type MessageKey = keyof typeof messages;
export type MessageValues = Record<string, string | number>;

export function t(key: string, values?: MessageValues): string {
	const template = (messages as Record<string, string>)[key] ?? key;

	if (!values) return template;

	return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
		name in values ? String(values[name]) : placeholder
	);
}
