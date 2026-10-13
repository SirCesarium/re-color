import { render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
// Registers the message catalogs and the locale so $t resolves real text.
import '../src/lib/app/i18n/index.ts';
import { hintsEnabled } from '../src/lib/app/state/hints.ts';
import PaletteStrip from '../src/lib/app/widgets/PaletteStrip.svelte';
import ResultPanel from '../src/lib/app/widgets/ResultPanel.svelte';

const PALETTE_BUDGET_KEY = 'recolor.hintSeen';
const PIXEL_HELP_KEY = 'recolor.resultPixelHelpSeen';

const color = { r: 10, g: 20, b: 30, active: true };
const resultUrl = 'data:image/png;base64,iVBORw0KGgo=';

/** Lets the widget's onMount run and the effects it schedules settle. */
async function flushEffects(): Promise<void> {
	await tick();
	await tick();
}

describe('one-time hints respect the hintsEnabled preference', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		hintsEnabled.set(true);
	});

	it('never spends the palette budget while hints are disabled', async () => {
		hintsEnabled.set(false);

		render(PaletteStrip, { colors: [{ ...color }] });
		await flushEffects();

		expect(localStorage.getItem(PALETTE_BUDGET_KEY)).toBeNull();
	});

	it('spends the palette budget when hints are enabled', async () => {
		hintsEnabled.set(true);

		render(PaletteStrip, { colors: [{ ...color }] });

		await waitFor(() => {
			expect(localStorage.getItem(PALETTE_BUDGET_KEY)).toBe('1');
		});
	});

	it('never marks the pixel help as seen while hints are disabled', async () => {
		hintsEnabled.set(false);

		render(ResultPanel, { imageUrl: resultUrl });
		await flushEffects();

		expect(localStorage.getItem(PIXEL_HELP_KEY)).toBeNull();
	});

	it('marks the pixel help as seen when hints are enabled', async () => {
		hintsEnabled.set(true);

		render(ResultPanel, { imageUrl: resultUrl });

		await waitFor(() => {
			expect(localStorage.getItem(PIXEL_HELP_KEY)).toBe('true');
		});
	});
});
