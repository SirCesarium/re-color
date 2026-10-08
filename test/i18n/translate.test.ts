import { expect, test } from 'bun:test';
import { get } from 'svelte/store';
import { locale, t } from 'svelte-i18n';
// Side-effect import: registers the dictionaries and calls init().
import '../../src/lib/i18n/index.ts';

const format = () => get(t);

test('translates messages when the locale changes', () => {
	locale.set('es');
	expect(format()('hero.tagline1')).toBe('Recolora un sprite');
	expect(format()('dropzone.upload', { values: { label: 'Paleta' } })).toBe(
		'Sube la imagen PNG Paleta'
	);

	locale.set('en');
	expect(format()('hero.tagline1')).toBe('Recolor a sprite');
	expect(format()('dropzone.upload', { values: { label: 'Palette' } })).toBe(
		'Upload Palette PNG image'
	);
});

test('interpolates values into localized errors', () => {
	locale.set('es');
	expect(format()('settings.importBadVersion', { values: { version: '2' } })).toBe(
		'Versión de archivo de ajustes no admitida: 2.'
	);
});

test('returns unknown keys unchanged', () => {
	expect(format()('missing.key.xyz')).toBe('missing.key.xyz');
	locale.set('en');
});
