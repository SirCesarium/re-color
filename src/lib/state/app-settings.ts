import { LocalizedError } from '../i18n/localized-error.ts';
import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n/locales.ts';
import type { MappingMode } from '../image-processing/types.ts';

export const APP_SETTINGS_KEY = 'recolor.settings';
export const HINT_STORAGE_KEYS = ['recolor.hintSeen', 'recolor.resultPixelHelpSeen'] as const;
export const SETTINGS_EXPORT_FORMAT = 're-color-settings';
export const SETTINGS_EXPORT_VERSION = 1;

export type AppSettings = {
	animationsEnabled: boolean;
	hintsEnabled: boolean;
	autoRecolor: boolean;
	persistWorkspace: boolean;
	maxPaletteColors: number;
	defaultMapping: MappingMode;
	locale: Locale;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
	animationsEnabled: true,
	hintsEnabled: true,
	autoRecolor: true,
	persistWorkspace: true,
	maxPaletteColors: 64,
	defaultMapping: 'luminance',
	locale: DEFAULT_LOCALE
};

const MAPPING_MODES: readonly MappingMode[] = ['nearest', 'luminance', 'dominant'];
const APP_SETTING_KEYS = [
	'animationsEnabled',
	'hintsEnabled',
	'autoRecolor',
	'persistWorkspace',
	'maxPaletteColors',
	'defaultMapping',
	'locale'
] as const satisfies readonly (keyof AppSettings)[];

export function isMappingMode(value: unknown): value is MappingMode {
	return typeof value === 'string' && MAPPING_MODES.some((mode) => mode === value);
}

function isAppSettings(value: unknown): value is AppSettings {
	if (!value || typeof value !== 'object') return false;

	const settings = value as Partial<Record<keyof AppSettings, unknown>>;
	return (
		typeof settings.animationsEnabled === 'boolean' &&
		typeof settings.autoRecolor === 'boolean' &&
		typeof settings.persistWorkspace === 'boolean' &&
		typeof settings.maxPaletteColors === 'number' &&
		Number.isInteger(settings.maxPaletteColors) &&
		settings.maxPaletteColors >= 1 &&
		settings.maxPaletteColors <= 256 &&
		isMappingMode(settings.defaultMapping) &&
		// Locale and hints are optional so older version 1 exports still import.
		(settings.locale === undefined || isLocale(settings.locale)) &&
		(settings.hintsEnabled === undefined || typeof settings.hintsEnabled === 'boolean')
	);
}

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
		throw new LocalizedError('settings.importBadVersion', { version: String(document.version) });
	}
	if (!isAppSettings(document.settings)) {
		throw new LocalizedError('settings.importInvalidPreferences');
	}

	const settings = document.settings;
	return {
		animationsEnabled: settings.animationsEnabled,
		autoRecolor: settings.autoRecolor,
		persistWorkspace: settings.persistWorkspace,
		maxPaletteColors: settings.maxPaletteColors,
		defaultMapping: settings.defaultMapping,
		locale: isLocale(settings.locale) ? settings.locale : DEFAULT_LOCALE,
		hintsEnabled:
			typeof settings.hintsEnabled === 'boolean'
				? settings.hintsEnabled
				: DEFAULT_APP_SETTINGS.hintsEnabled
	};
}

export function parseAppSettings(
	value: string | null,
	localeFallback: Locale = DEFAULT_LOCALE
): AppSettings {
	if (!value) return { ...DEFAULT_APP_SETTINGS, locale: localeFallback };

	try {
		const candidate: unknown = JSON.parse(value);
		if (!candidate || typeof candidate !== 'object') return { ...DEFAULT_APP_SETTINGS, locale: localeFallback };

		const stored = candidate as Partial<Record<keyof AppSettings, unknown>>;

		return {
			animationsEnabled:
				typeof stored.animationsEnabled === 'boolean'
					? stored.animationsEnabled
					: DEFAULT_APP_SETTINGS.animationsEnabled,
			hintsEnabled:
				typeof stored.hintsEnabled === 'boolean'
					? stored.hintsEnabled
					: DEFAULT_APP_SETTINGS.hintsEnabled,
			autoRecolor:
				typeof stored.autoRecolor === 'boolean'
					? stored.autoRecolor
					: DEFAULT_APP_SETTINGS.autoRecolor,
			persistWorkspace:
				typeof stored.persistWorkspace === 'boolean'
					? stored.persistWorkspace
					: DEFAULT_APP_SETTINGS.persistWorkspace,
			maxPaletteColors:
				typeof stored.maxPaletteColors === 'number' &&
				Number.isInteger(stored.maxPaletteColors) &&
				stored.maxPaletteColors >= 1 &&
				stored.maxPaletteColors <= 256
					? stored.maxPaletteColors
					: DEFAULT_APP_SETTINGS.maxPaletteColors,
			defaultMapping:
				isMappingMode(stored.defaultMapping)
					? stored.defaultMapping
					: DEFAULT_APP_SETTINGS.defaultMapping,
			locale: isLocale(stored.locale) ? stored.locale : localeFallback
		};
	} catch {
		return { ...DEFAULT_APP_SETTINGS, locale: localeFallback };
	}
}

export type PersistedWorkspace = {
	palette: { name: string; blob: Blob } | null;
	sprite: { name: string; blob: Blob } | null;
	mapping: MappingMode;
	colors: { r: number; g: number; b: number; active: boolean }[];
	excludedPixels: number[];
};

const DATABASE = 'recolor-workspace';
const DATABASE_VERSION = 1;
const STORE = 'state';
const WORKSPACE_KEY = 'current';

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DATABASE, DATABASE_VERSION);

		request.onupgradeneeded = () => {
			request.result.createObjectStore(STORE);
		};
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error ?? new Error('Could not open local workspace'));
	});
}

export async function loadWorkspace(): Promise<PersistedWorkspace | null> {
	const database = await openDatabase();

	try {
		return await new Promise((resolve, reject) => {
			const request = database.transaction(STORE, 'readonly').objectStore(STORE).get(WORKSPACE_KEY);
			request.onsuccess = () => resolve((request.result as PersistedWorkspace | undefined) ?? null);
			request.onerror = () => reject(request.error ?? new Error('Could not load saved workspace'));
		});
	} finally {
		database.close();
	}
}

export async function saveWorkspace(workspace: PersistedWorkspace): Promise<void> {
	const database = await openDatabase();

	try {
		await new Promise<void>((resolve, reject) => {
			const transaction = database.transaction(STORE, 'readwrite');
			transaction.objectStore(STORE).put(workspace, WORKSPACE_KEY);
			transaction.oncomplete = () => resolve();
			transaction.onerror = () =>
				reject(transaction.error ?? new Error('Could not save workspace'));
			transaction.onabort = () => reject(transaction.error ?? new Error('Saving workspace aborted'));
		});
	} finally {
		database.close();
	}
}

export async function clearWorkspace(): Promise<void> {
	const database = await openDatabase();

	try {
		await new Promise<void>((resolve, reject) => {
			const transaction = database.transaction(STORE, 'readwrite');
			transaction.objectStore(STORE).clear();
			transaction.oncomplete = () => resolve();
			transaction.onerror = () =>
				reject(transaction.error ?? new Error('Could not clear saved workspace'));
			transaction.onabort = () =>
				reject(transaction.error ?? new Error('Clearing workspace aborted'));
		});
	} finally {
		database.close();
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
