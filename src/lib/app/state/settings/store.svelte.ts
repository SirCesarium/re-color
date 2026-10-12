import { MAPPING_STORAGE_KEY } from '#core/recolor.ts';
import { localeFromNavigator, setLocale } from '../../i18n/index.ts';
import { hintsEnabled } from '../hints.ts';
import {
	type AppSettings,
	DEFAULT_APP_SETTINGS,
	isMappingMode
} from './model.ts';
import {
	APP_SETTINGS_KEY,
	exportAppSettings,
	parseAppSettings
} from './repository.ts';

// The app's one copy of the user's preferences. A module-level rune means the
// workflow store and the settings page read the same reactive object rather
// than two copies that drift apart.
export const settings = $state<AppSettings>({ ...DEFAULT_APP_SETTINGS });

/** Reads storage, migrating the pre-settings `recolor.mapping` key if present. */
function readStored(): AppSettings {
	if (typeof localStorage === 'undefined') return { ...DEFAULT_APP_SETTINGS };

	try {
		const stored = localStorage.getItem(APP_SETTINGS_KEY);
		const parsed = parseAppSettings(stored, localeFromNavigator());

		if (!stored) {
			const legacy = localStorage.getItem(MAPPING_STORAGE_KEY);

			if (isMappingMode(legacy)) parsed.defaultMapping = legacy;
		}

		return parsed;
	} catch (error) {
		console.error('Could not read saved app settings', error);

		return { ...DEFAULT_APP_SETTINGS };
	}
}

/** The single write path; returns false when storage rejects the save. */
function persist(): boolean {
	try {
		localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));

		return true;
	} catch (error) {
		console.error('Could not save app settings', error);

		return false;
	}
}

/**
 * Fans a settings change out to the parts of the app that mirror it. Each call
 * re-applies all three, which is safe: every one is a no-op when the value is
 * unchanged, so this stays idempotent no matter which key moved.
 */
function applySideEffects(): void {
	if (typeof document !== 'undefined') {
		document.documentElement.classList.toggle(
			'animations-disabled',
			!settings.animationsEnabled
		);
	}

	setLocale(settings.locale);
	hintsEnabled.set(settings.hintsEnabled);
}

/** (Re)reads storage into the reactive state and applies its side effects. */
export function loadSettings(): AppSettings {
	Object.assign(settings, readStored());
	applySideEffects();

	return settings;
}

/** Changes one preference, applying side effects and persisting in one step. */
export function updateSetting<K extends keyof AppSettings>(
	key: K,
	value: AppSettings[K]
): boolean {
	settings[key] = value;
	applySideEffects();

	return persist();
}

/** Swaps in a whole settings object (import / reset) and applies it at once. */
export function replaceSettings(next: AppSettings): boolean {
	Object.assign(settings, next);
	applySideEffects();

	return persist();
}

/** Restores factory defaults, clearing the legacy mapping key so it can't re-migrate. */
export function resetSettings(): boolean {
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(MAPPING_STORAGE_KEY);
	}

	return replaceSettings({ ...DEFAULT_APP_SETTINGS });
}

/** Current settings as an export-ready JSON document. */
export function serializeSettings(): string {
	return exportAppSettings(settings);
}

// Load once at import so every consumer sees populated settings immediately.
loadSettings();
