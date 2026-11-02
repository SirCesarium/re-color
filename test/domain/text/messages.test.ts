import { expect, test } from 'vitest';
import { t } from '../../../src/lib/app/text/index.ts';

test('returns the message for a known key', () => {
	expect(t('hero.tagline1')).toBe('Recolor a sprite');
});

test('interpolates values into messages', () => {
	expect(t('dropzone.upload', { label: 'Palette' })).toBe('Upload Palette PNG image');
	expect(t('settings.importBadVersion', { version: '2' })).toBe(
		'Unsupported settings file version: 2.'
	);
});

test('returns unknown keys unchanged', () => {
	expect(t('missing.key.xyz')).toBe('missing.key.xyz');
});
