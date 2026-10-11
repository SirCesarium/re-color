import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { z } from 'zod';
import { LocalizedError } from '../i18n/localized-error.ts';
import { DEFAULT_LOCALE, LOCALE_SCHEMA, type Locale } from '../i18n/locales.ts';
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

const MAPPING_MODES = ['nearest', 'luminance', 'dominant'] as const satisfies readonly MappingMode[];
const MAPPING_MODE_SCHEMA = z.enum(MAPPING_MODES);
const APP_SETTING_KEYS = [
	'animationsEnabled',
	'hintsEnabled',
	'autoRecolor',
	'persistWorkspace',
	'maxPaletteColors',
	'defaultMapping',
	'locale'
] as const satisfies readonly (keyof AppSettings)[];

/**
 * Strict schema applied to settings documents.
 *
 * `locale` and `hintsEnabled` are optional so older version 1 exports still import.
 */
const APP_SETTINGS_SCHEMA = z.object({
	animationsEnabled: z.boolean(),
	hintsEnabled: z.boolean().optional(),
	autoRecolor: z.boolean(),
	persistWorkspace: z.boolean(),
	maxPaletteColors: z.number().int().min(1).max(256),
	defaultMapping: MAPPING_MODE_SCHEMA,
	locale: LOCALE_SCHEMA.optional()
});

/** Lenient schema for stored settings: invalid or missing fields fall back individually. */
function storedAppSettingsSchema(localeFallback: Locale) {
	return z
		.object({
			animationsEnabled: z.boolean().catch(DEFAULT_APP_SETTINGS.animationsEnabled),
			hintsEnabled: z.boolean().catch(DEFAULT_APP_SETTINGS.hintsEnabled),
			autoRecolor: z.boolean().catch(DEFAULT_APP_SETTINGS.autoRecolor),
			persistWorkspace: z.boolean().catch(DEFAULT_APP_SETTINGS.persistWorkspace),
			maxPaletteColors: z
				.number()
				.int()
				.min(1)
				.max(256)
				.catch(DEFAULT_APP_SETTINGS.maxPaletteColors),
			defaultMapping: MAPPING_MODE_SCHEMA.catch(DEFAULT_APP_SETTINGS.defaultMapping),
			locale: LOCALE_SCHEMA.catch(localeFallback)
		})
		.catch({ ...DEFAULT_APP_SETTINGS, locale: localeFallback });
}

export function isMappingMode(value: unknown): value is MappingMode {
	return MAPPING_MODE_SCHEMA.safeParse(value).success;
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

interface WorkspaceDatabase extends DBSchema {
	state: {
		key: string;
		value: PersistedWorkspace;
	};
}

let databasePromise: Promise<IDBPDatabase<WorkspaceDatabase>> | undefined;

/** Reuses one connection, reopening after failures or an upgrade in another tab. */
function openDatabase(): Promise<IDBPDatabase<WorkspaceDatabase>> {
	databasePromise ??= openDB<WorkspaceDatabase>(DATABASE, DATABASE_VERSION, {
		upgrade(database) {
			database.createObjectStore(STORE);
		}
	}).then(
		(database) => {
			database.addEventListener('versionchange', () => {
				database.close();
				databasePromise = undefined;
			});

			return database;
		},
		(error) => {
			databasePromise = undefined;
			throw error;
		}
	);

	return databasePromise;
}

export async function loadWorkspace(): Promise<PersistedWorkspace | null> {
	const database = await openDatabase();
	const workspace = await database.get(STORE, WORKSPACE_KEY);

	return workspace ?? null;
}

export async function saveWorkspace(workspace: PersistedWorkspace): Promise<void> {
	const database = await openDatabase();

	await database.put(STORE, workspace, WORKSPACE_KEY);
}

export async function clearWorkspace(): Promise<void> {
	const database = await openDatabase();

	await database.clear(STORE);
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
