import 'fake-indexeddb/auto';

import { expect, test } from 'bun:test';
import {
	clearWorkspace,
	loadWorkspace,
	saveWorkspace,
	type PersistedWorkspace
} from '../../src/lib/state/app-settings.ts';

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
