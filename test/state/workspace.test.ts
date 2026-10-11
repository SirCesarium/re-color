import 'fake-indexeddb/auto';

import { afterEach, beforeEach, expect, test } from 'bun:test';
import {
	APP_SETTINGS_KEY,
	HINT_STORAGE_KEYS,
	clearSavedAppData,
	clearWorkspace,
	loadWorkspace,
	resetHints,
	saveWorkspace,
	type PersistedWorkspace
} from '../../src/lib/state/app-settings.ts';
import { installFakeLocalStorage } from '../support/fake-storage.ts';

let uninstallStorage: (() => void) | undefined;

beforeEach(() => {
	uninstallStorage = installFakeLocalStorage();
});

afterEach(() => {
	uninstallStorage?.();
});

const workspace: PersistedWorkspace = {
	palette: null,
	sprite: null,
	mapping: 'luminance',
	colors: [
		{ r: 10, g: 20, b: 30, active: true },
		{ r: 240, g: 200, b: 96, active: false }
	],
	excludedPixels: [3, 5, 8]
};

test('starts with no saved workspace', async () => {
	expect(await loadWorkspace()).toBeNull();
});

test('saves and restores the workspace', async () => {
	await saveWorkspace(workspace);

	expect(await loadWorkspace()).toEqual(workspace);
});

test('overwrites the previously saved workspace', async () => {
	const next: PersistedWorkspace = {
		...workspace,
		mapping: 'dominant',
		colors: [{ r: 255, g: 255, b: 255, active: true }],
		excludedPixels: []
	};

	await saveWorkspace(next);

	expect(await loadWorkspace()).toEqual(next);
});

test('clears the saved workspace', async () => {
	await clearWorkspace();

	expect(await loadWorkspace()).toBeNull();
});

test('roundtrips image blobs with their names', async () => {
	const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
	const withImages: PersistedWorkspace = {
		palette: { name: 'palette.png', blob: new Blob([bytes], { type: 'image/png' }) },
		sprite: { name: 'sprite.png', blob: new Blob([bytes], { type: 'image/png' }) },
		mapping: 'dominant',
		colors: [],
		excludedPixels: []
	};

	await saveWorkspace(withImages);
	const restored = await loadWorkspace();

	expect(restored).not.toBeNull();
	expect(restored?.palette?.name).toBe('palette.png');
	expect(restored?.palette?.blob.type).toBe('image/png');
	expect([...new Uint8Array(await (restored?.palette?.blob as Blob).arrayBuffer())]).toEqual([
		...bytes
	]);
	expect(restored?.sprite?.name).toBe('sprite.png');
	expect(restored?.mapping).toBe('dominant');
});

test('clearing the workspace leaves an empty one loadable', async () => {
	await saveWorkspace(workspace);
	await clearWorkspace();

	expect(await loadWorkspace()).toBeNull();

	// Saving again after a clear must not depend on prior state.
	await saveWorkspace(workspace);
	expect(await loadWorkspace()).toEqual(workspace);
});

test('clearing saved app data removes settings, hints, legacy keys, and the workspace', async () => {
	await saveWorkspace(workspace);
	localStorage.setItem(APP_SETTINGS_KEY, '{"maxPaletteColors":8}');
	localStorage.setItem('recolor.mapping', 'nearest');
	for (const key of HINT_STORAGE_KEYS) localStorage.setItem(key, '3');

	await clearSavedAppData();

	expect(await loadWorkspace()).toBeNull();
	for (const key of [APP_SETTINGS_KEY, 'recolor.mapping', ...HINT_STORAGE_KEYS]) {
		expect(localStorage.getItem(key)).toBeNull();
	}
});

test('resetting hints keeps the saved settings untouched', async () => {
	localStorage.setItem(APP_SETTINGS_KEY, '{"maxPaletteColors":8}');
	for (const key of HINT_STORAGE_KEYS) localStorage.setItem(key, 'true');

	resetHints();

	for (const key of HINT_STORAGE_KEYS) expect(localStorage.getItem(key)).toBeNull();
	expect(localStorage.getItem(APP_SETTINGS_KEY)).toBe('{"maxPaletteColors":8}');

	localStorage.removeItem(APP_SETTINGS_KEY);
});
