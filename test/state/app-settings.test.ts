import { expect, test } from 'bun:test';
import { LocalizedError } from '../../src/lib/i18n/localized-error.ts';
import {
	DEFAULT_APP_SETTINGS,
	exportAppSettings,
	importAppSettings,
	isMappingMode,
	parseAppSettings
} from '../../src/lib/state/app-settings.ts';

/** Runs an import that must fail and returns the localized rejection. */
function importFailure(json: string): LocalizedError {
	try {
		importAppSettings(json);
	} catch (cause) {
		if (cause instanceof LocalizedError) return cause;

		throw cause;
	}

	throw new Error('expected the settings import to fail');
}

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

test('falls back to the defaults when the stored value is not an object', () => {
	// JSON arrays, numbers, and null are not settings documents.
	for (const stored of ['[]', '[1,2,3]', '5', '"settings"', 'null', '{}']) {
		expect(parseAppSettings(stored), stored).toEqual(DEFAULT_APP_SETTINGS);
	}
});

test('recovers each invalid field individually without discarding valid ones', () => {
	const restored = parseAppSettings(
		JSON.stringify({
			animationsEnabled: 'yes',
			hintsEnabled: false,
			autoRecolor: false,
			persistWorkspace: false,
			maxPaletteColors: 32,
			defaultMapping: 'nearest',
			locale: 'es'
		})
	);

	// Only the tampered boolean reverts; every other preference survives.
	expect(restored.animationsEnabled).toBe(DEFAULT_APP_SETTINGS.animationsEnabled);
	expect(restored.hintsEnabled).toBe(false);
	expect(restored.maxPaletteColors).toBe(32);
	expect(restored.defaultMapping).toBe('nearest');
	expect(restored.locale).toBe('es');
});

test('ignores unknown stored keys', () => {
	const restored = parseAppSettings(
		JSON.stringify({
			...DEFAULT_APP_SETTINGS,
			theme: 'dark',
			maxPaletteColors: 1
		})
	);

	expect(restored).toEqual({ ...DEFAULT_APP_SETTINGS, maxPaletteColors: 1 });
	expect('theme' in restored).toBe(false);
});

test('accepts the palette size boundaries', () => {
	const smallest = parseAppSettings(
		JSON.stringify({ ...DEFAULT_APP_SETTINGS, maxPaletteColors: 1 })
	);
	expect(smallest.maxPaletteColors).toBe(1);

	const largest = parseAppSettings(
		JSON.stringify({ ...DEFAULT_APP_SETTINGS, maxPaletteColors: 256 })
	);
	expect(largest.maxPaletteColors).toBe(256);
});

test('rejects exports without a usable version', () => {
	// A missing version reports the raw undefined value.
	const missing = importFailure(
		JSON.stringify({ format: 're-color-settings', settings: DEFAULT_APP_SETTINGS })
	);
	expect(missing.messageId).toBe('settings.importBadVersion');
	expect(missing.values).toEqual({ version: 'undefined' });

	// A version of the wrong type is reported verbatim.
	const wrongType = importFailure(
		JSON.stringify({ format: 're-color-settings', version: '1', settings: DEFAULT_APP_SETTINGS })
	);
	expect(wrongType.messageId).toBe('settings.importBadVersion');
	expect(wrongType.values).toEqual({ version: '1' });
});

test('rejects exports whose settings are missing or not an object', () => {
	expect(() =>
		importAppSettings(JSON.stringify({ format: 're-color-settings', version: 1, settings: null }))
	).toThrow('settings.importInvalidPreferences');

	expect(() =>
		importAppSettings(JSON.stringify({ format: 're-color-settings', version: 1, settings: 7 })
		)).toThrow('settings.importInvalidPreferences');
});

test('strips unknown keys when importing settings', () => {
	const imported = importAppSettings(
		JSON.stringify({
			format: 're-color-settings',
			version: 1,
			settings: { ...DEFAULT_APP_SETTINGS, telemetry: true }
		})
	);

	expect(imported).toEqual(DEFAULT_APP_SETTINGS);
	expect('telemetry' in imported).toBe(false);
});
