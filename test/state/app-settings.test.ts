import { expect, test } from 'bun:test';
import {
	DEFAULT_APP_SETTINGS,
	exportAppSettings,
	importAppSettings,
	isMappingMode,
	parseAppSettings
} from '../../src/lib/state/app-settings.ts';

test('uses the built-in app settings when saved preferences are absent or invalid', () => {
	expect(parseAppSettings(null)).toEqual(DEFAULT_APP_SETTINGS);
	expect(parseAppSettings('{ invalid json')).toEqual(DEFAULT_APP_SETTINGS);
	expect(parseAppSettings(JSON.stringify({ maxPaletteColors: 257 }))).toEqual(DEFAULT_APP_SETTINGS);
	expect(parseAppSettings(JSON.stringify({ maxPaletteColors: 0 }))).toEqual(DEFAULT_APP_SETTINGS);
	expect(parseAppSettings(JSON.stringify({ defaultMapping: 'unknown' }))).toEqual(DEFAULT_APP_SETTINGS);
});

test('restores valid saved preferences', () => {
	expect(
		parseAppSettings(
			JSON.stringify({
				animationsEnabled: false,
				hintsEnabled: false,
				autoRecolor: false,
				persistWorkspace: false,
				maxPaletteColors: 256,
				defaultMapping: 'nearest',
				locale: 'es'
			})
		)
	).toEqual({
		animationsEnabled: false,
		hintsEnabled: false,
		autoRecolor: false,
		persistWorkspace: false,
		maxPaletteColors: 256,
		defaultMapping: 'nearest',
		locale: 'es'
	});
});

test('validates supported mapping modes without unsafe casts', () => {
	expect(isMappingMode('dominant')).toBe(true);
	expect(isMappingMode('custom')).toBe(false);
	expect(isMappingMode(null)).toBe(false);
});

test('exports and imports only versioned app settings', () => {
	const settings = {
		animationsEnabled: false,
		hintsEnabled: true,
		autoRecolor: false,
		persistWorkspace: false,
		maxPaletteColors: 180,
		defaultMapping: 'dominant' as const,
		locale: 'es' as const
	};
	const exported = exportAppSettings(settings);
	const document = JSON.parse(exported);

	expect(document).toEqual({
		format: 're-color-settings',
		version: 1,
		settings
	});
	expect(exported).not.toContain('workspace');
	expect(importAppSettings(exported)).toEqual(settings);
});

test('rejects unsupported or invalid settings exports', () => {
	expect(() => importAppSettings('{ invalid json')).toThrow('settings.importInvalidJson');
	expect(() => importAppSettings(JSON.stringify({ format: 'other', version: 1 }))).toThrow(
		'settings.importWrongFormat'
	);
	expect(
		() =>
			importAppSettings(
				JSON.stringify({ format: 're-color-settings', version: 2, settings: DEFAULT_APP_SETTINGS })
			)
	).toThrow('settings.importBadVersion');
	expect(
		() =>
			importAppSettings(
				JSON.stringify({
					format: 're-color-settings',
					version: 1,
					settings: { ...DEFAULT_APP_SETTINGS, maxPaletteColors: 1000 }
				})
			)
	).toThrow('settings.importInvalidPreferences');
});

test('uses the browser locale when saved preferences predate it', () => {
	expect(parseAppSettings(null, 'es')).toEqual({ ...DEFAULT_APP_SETTINGS, locale: 'es' });
	expect(parseAppSettings(JSON.stringify({ locale: 'de' }), 'es')).toEqual({
		...DEFAULT_APP_SETTINGS,
		locale: 'es'
	});
	expect(parseAppSettings(JSON.stringify({ locale: 'es' }), 'en')).toEqual({
		...DEFAULT_APP_SETTINGS,
		locale: 'es'
	});
});

test('imports version 1 exports without a locale setting', () => {
	const legacy = JSON.stringify({
		format: 're-color-settings',
		version: 1,
		settings: {
			animationsEnabled: false,
			autoRecolor: true,
			persistWorkspace: true,
			maxPaletteColors: 64,
			defaultMapping: 'luminance'
		}
	});

	expect(importAppSettings(legacy)).toEqual({
		animationsEnabled: false,
		hintsEnabled: true,
		autoRecolor: true,
		persistWorkspace: true,
		maxPaletteColors: 64,
		defaultMapping: 'luminance',
		locale: 'en'
	});
});
