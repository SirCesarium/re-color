import { z } from 'zod';
import type { MappingMode } from '#core/image-processing/index.ts';

export type AppSettings = {
	animationsEnabled: boolean;
	hintsEnabled: boolean;
	autoRecolor: boolean;
	persistWorkspace: boolean;
	maxPaletteColors: number;
	defaultMapping: MappingMode;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
	animationsEnabled: true,
	hintsEnabled: true,
	autoRecolor: true,
	persistWorkspace: true,
	maxPaletteColors: 64,
	defaultMapping: 'luminance'
};

const MAPPING_MODES = [
	'nearest',
	'luminance',
	'dominant'
] as const satisfies readonly MappingMode[];
const MAPPING_MODE_SCHEMA = z.enum(MAPPING_MODES);

export const APP_SETTING_KEYS = [
	'animationsEnabled',
	'hintsEnabled',
	'autoRecolor',
	'persistWorkspace',
	'maxPaletteColors',
	'defaultMapping'
] as const satisfies readonly (keyof AppSettings)[];

/**
 * The schema for imported settings documents.
 *
 * `hintsEnabled` is optional so that version 1 exports, which predate it,
 * still import.
 */
export const APP_SETTINGS_SCHEMA = z.object({
	animationsEnabled: z.boolean(),
	hintsEnabled: z.boolean().optional(),
	autoRecolor: z.boolean(),
	persistWorkspace: z.boolean(),
	maxPaletteColors: z.number().int().min(1).max(256),
	defaultMapping: MAPPING_MODE_SCHEMA
});

/**
 * The same fields, but for settings we read back from storage: anything
 * missing or corrupt falls back to its own default instead of blowing up.
 */
export function storedAppSettingsSchema() {
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
			defaultMapping: MAPPING_MODE_SCHEMA.catch(DEFAULT_APP_SETTINGS.defaultMapping)
		})
		.catch(DEFAULT_APP_SETTINGS);
}

export function isMappingMode(value: unknown): value is MappingMode {
	return MAPPING_MODE_SCHEMA.safeParse(value).success;
}
