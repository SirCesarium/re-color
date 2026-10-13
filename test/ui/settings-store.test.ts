import { get } from 'svelte/store';
import { locale } from 'svelte-i18n';
import { beforeEach, describe, expect, it } from 'vitest';
import { hintsEnabled } from '../src/lib/app/state/hints.ts';
import {
	type AppSettings,
	DEFAULT_APP_SETTINGS
} from '../src/lib/app/state/settings/model.ts';
import {
	APP_SETTINGS_KEY,
	exportAppSettings,
	importAppSettings
} from '../src/lib/app/state/settings/repository.ts';
import {
	loadSettings,
	replaceSettings,
	settings,
	updateSetting
} from '../src/lib/app/state/settings/store.svelte.ts';

/** Writes a settings blob the way the app would find it on a return visit. */
function saveSettings(overrides: Partial<AppSettings>): void {
	localStorage.setItem(
		APP_SETTINGS_KEY,
		JSON.stringify({ ...DEFAULT_APP_SETTINGS, ...overrides })
	);
}

beforeEach(() => {
	localStorage.clear();
	document.documentElement.classList.remove('animations-disabled');

	// Re-read storage (now empty) so each test starts from defaults.
	loadSettings();
});

describe('reading settings', () => {
	it('falls back to defaults when nothing is saved', () => {
		expect(settings).toEqual({
			...DEFAULT_APP_SETTINGS,
			locale: settings.locale
		});
	});

	it('reads saved settings back from localStorage', () => {
		saveSettings({ animationsEnabled: false, maxPaletteColors: 8 });

		loadSettings();

		expect(settings.animationsEnabled).toBe(false);
		expect(settings.maxPaletteColors).toBe(8);
	});
});

describe('updateSetting', () => {
	it('persists the change to localStorage', () => {
		updateSetting('maxPaletteColors', 12);

		const stored = JSON.parse(
			localStorage.getItem(APP_SETTINGS_KEY) ?? '{}'
		) as Partial<AppSettings>;

		expect(stored.maxPaletteColors).toBe(12);
	});

	it('toggles the animations-disabled class on the document', () => {
		updateSetting('animationsEnabled', false);

		expect(
			document.documentElement.classList.contains('animations-disabled')
		).toBe(true);

		updateSetting('animationsEnabled', true);

		expect(
			document.documentElement.classList.contains('animations-disabled')
		).toBe(false);
	});

	it('switches the active locale', () => {
		updateSetting('locale', 'es');

		expect(get(locale)).toBe('es');
	});

	it('keeps the help-hints store in sync', () => {
		updateSetting('hintsEnabled', false);

		expect(get(hintsEnabled)).toBe(false);
	});
});

describe('replaceSettings', () => {
	it('applies locale, hints, and animations together', () => {
		const imported = importAppSettings(
			exportAppSettings({
				...DEFAULT_APP_SETTINGS,
				locale: 'es',
				hintsEnabled: false,
				animationsEnabled: false
			})
		);

		replaceSettings(imported);

		expect(get(locale)).toBe('es');
		expect(get(hintsEnabled)).toBe(false);
		expect(
			document.documentElement.classList.contains('animations-disabled')
		).toBe(true);
	});

	it('persists the whole replacement', () => {
		replaceSettings({
			...DEFAULT_APP_SETTINGS,
			locale: settings.locale,
			maxPaletteColors: 4
		});

		const stored = JSON.parse(
			localStorage.getItem(APP_SETTINGS_KEY) ?? '{}'
		) as Partial<AppSettings>;

		expect(stored.maxPaletteColors).toBe(4);
	});
});
