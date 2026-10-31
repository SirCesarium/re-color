import { DEFAULT_LOCALE, type Locale } from '../../i18n/locales.ts';
import { LocalizedError } from '../../i18n/localized-error.ts';
import { clearWorkspace } from '../workspace.ts';
import {
	APP_SETTING_KEYS,
	APP_SETTINGS_SCHEMA,
	type AppSettings,
	DEFAULT_APP_SETTINGS,
	storedAppSettingsSchema
} from './model.ts';

export const APP_SETTINGS_KEY = 'recolor.settings';
export const HINT_STORAGE_KEYS = ['recolor.hintSeen', 'recolor.resultPixelHelpSeen'] as const;
export const SETTINGS_EXPORT_FORMAT = 're-color-settings';
export const SETTINGS_EXPORT_VERSION = 1;

export function exportAppSettings(settings: AppSettings): string {
	return JSON.stringify(
		{
			format: SETTINGS_EXPORT_FORMAT,
			version: SETTINGS_EXPORT_VERSION,
			settings: Object.fromEntries(APP_SETTING_KEYS.map((key) => [key, settings[key]]))
		},
		null,
		2
	);
}

export function importAppSettings(json: string): AppSettings {
	let candidate: unknown;

	try {
		candidate = JSON.parse(json);
	} catch {
		throw new LocalizedError('settings.importInvalidJson');
	}

	if (!candidate || typeof candidate !== 'object') {
		throw new LocalizedError('settings.importNotSettings');
	}

	const document = candidate as Record<string, unknown>;

	if (document.format !== SETTINGS_EXPORT_FORMAT) {
		throw new LocalizedError('settings.importWrongFormat');
	}

	if (document.version !== SETTINGS_EXPORT_VERSION) {
		throw new LocalizedError('settings.importBadVersion', {
			version: String(document.version)
		});
	}

	const parsed = APP_SETTINGS_SCHEMA.safeParse(document.settings);

	if (!parsed.success) {
		throw new LocalizedError('settings.importInvalidPreferences');
	}

	return {
		...parsed.data,
		locale: parsed.data.locale ?? DEFAULT_LOCALE,
		hintsEnabled: parsed.data.hintsEnabled ?? DEFAULT_APP_SETTINGS.hintsEnabled
	};
}

export function parseAppSettings(
	value: string | null,
	localeFallback: Locale = DEFAULT_LOCALE
): AppSettings {
	if (!value) return { ...DEFAULT_APP_SETTINGS, locale: localeFallback };

	try {
		const candidate: unknown = JSON.parse(value);

		return storedAppSettingsSchema(localeFallback).parse(candidate);
	} catch {
		return { ...DEFAULT_APP_SETTINGS, locale: localeFallback };
	}
}

export async function clearSavedAppData(): Promise<void> {
	await clearWorkspace();

	for (const key of [APP_SETTINGS_KEY, 'recolor.mapping', ...HINT_STORAGE_KEYS]) {
		localStorage.removeItem(key);
	}
}

export function resetHints(): void {
	for (const key of HINT_STORAGE_KEYS) {
		localStorage.removeItem(key);
	}
}
