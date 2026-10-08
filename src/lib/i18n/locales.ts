import en from './messages/en.json';

export const SUPPORTED_LOCALES = ['en', 'es'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Every valid message key, derived from the English dictionary. */
export type MessageKey = keyof typeof en;

export const DEFAULT_LOCALE: Locale = 'en';

/** Language names, always shown in their own language. */
export const LOCALE_LABELS: Record<Locale, string> = {
	en: 'English',
	es: 'Español'
};

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
