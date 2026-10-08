import { addMessages, init, locale as localeStore } from 'svelte-i18n';
import { APP_SETTINGS_KEY, parseAppSettings } from '#lib/state/app-settings.ts';
import { DEFAULT_LOCALE, isLocale, type Locale } from './locales.ts';
import en from './messages/en.json';
import es from './messages/es.json';

addMessages('en', en);
addMessages('es', es);

/** Best supported locale for the browser, e.g. "es-419" -> "es". */
export function localeFromNavigator(): Locale {
	if (typeof navigator === 'undefined') return DEFAULT_LOCALE;

	for (const candidate of [navigator.language, ...(navigator.languages ?? [])]) {
		const base = String(candidate).split('-')[0]?.toLowerCase();
		if (isLocale(base)) return base;
	}

	return DEFAULT_LOCALE;
}

export function setLocale(next: Locale): void {
	localeStore.set(next);
}

/** Saved locale on first visit, or the browser language. */
function initialLocale(): Locale {
	if (typeof localStorage === 'undefined') return DEFAULT_LOCALE;

	try {
		return parseAppSettings(localStorage.getItem(APP_SETTINGS_KEY), localeFromNavigator()).locale;
	} catch {
		return DEFAULT_LOCALE;
	}
}

init({ fallbackLocale: DEFAULT_LOCALE, initialLocale: initialLocale() });
