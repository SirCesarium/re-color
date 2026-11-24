import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { hintsEnabled } from '../../src/lib/app/state/hints.ts';
import PaletteStrip from '../../src/lib/app/widgets/PaletteStrip.svelte';

describe('PaletteStrip', () => {
	beforeEach(() => {
		localStorage.clear();
		hintsEnabled.set(false);
	});

	afterEach(() => {
		hintsEnabled.set(true);
	});

	it('keeps the decorative placeholder strip when no colors are loaded', () => {
		const { container } = render(PaletteStrip, { colors: [] });

		expect(container.querySelectorAll('[aria-hidden="true"] span')).toHaveLength(7);
		expect(screen.queryByRole('button', { name: 'Add color' })).toBeNull();
		expect(screen.queryByTestId('palette-count')).toBeNull();
	});

	it('toggles colors on and off and restores them with enable all', async () => {
		render(PaletteStrip, {
			colors: [
				{ r: 255, g: 0, b: 0, active: true },
				{ r: 0, g: 255, b: 0, active: true }
			]
		});

		expect(screen.getByTestId('palette-count').textContent?.trim()).toBe('2 / 2 active');

		const redSwatch = screen.getByRole('button', { name: 'Disable color #ff0000' });
		await fireEvent.click(redSwatch);

		expect(
			screen.getByRole('button', { name: 'Enable color #ff0000' }).getAttribute('aria-pressed')
		).toBe('false');
		expect(screen.getByTestId('palette-count').textContent?.trim()).toBe('1 / 2 active');

		const enableAll = screen.getByRole('button', { name: 'enable all' });
		await fireEvent.click(enableAll);

		expect(screen.getByTestId('palette-count').textContent?.trim()).toBe('2 / 2 active');
		expect(screen.queryByRole('button', { name: 'enable all' })).toBeNull();
	});

	it('adds a custom color via hex input and activates an existing inactive match', async () => {
		render(PaletteStrip, {
			colors: [{ r: 16, g: 32, b: 48, active: false }]
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Add color' }));

		const hexInput = screen.getByRole('textbox', { name: 'Hex color code' });
		const confirmBtn = screen.getByRole('button', { name: 'Add' }) as HTMLButtonElement;

		// Invalid hex disables the confirm button
		await fireEvent.input(hexInput, { target: { value: 'zzzzzz' } });
		expect(confirmBtn.disabled).toBe(true);

		// Valid new hex adds a custom color (distinguished and removable on click)
		await fireEvent.input(hexInput, { target: { value: '#ff00aa' } });
		expect(confirmBtn.disabled).toBe(false);
		await fireEvent.click(confirmBtn);

		const customSwatch = screen.getByRole('button', { name: 'Remove added color #ff00aa' });
		expect(customSwatch.dataset.custom).toBe('true');
		expect(screen.getByTestId('palette-count').textContent?.trim()).toBe('1 / 2 active');

		// Clicking the added color removes it completely
		await fireEvent.click(customSwatch);
		expect(screen.queryByRole('button', { name: 'Remove added color #ff00aa' })).toBeNull();
		expect(screen.getByTestId('palette-count').textContent?.trim()).toBe('0 / 1 active');

		// Re-adding an existing inactive extracted color activates it without duplicating
		await fireEvent.click(screen.getByRole('button', { name: 'Add color' }));
		await fireEvent.input(screen.getByRole('textbox', { name: 'Hex color code' }), {
			target: { value: '#102030' }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Add' }));

		expect(
			screen.getByRole('button', { name: 'Disable color #102030' }).getAttribute('aria-pressed')
		).toBe('true');
		expect(screen.getByTestId('palette-count').textContent?.trim()).toBe('1 / 1 active');
	});

	it('closes the add color bar on Escape', async () => {
		render(PaletteStrip, {
			colors: [{ r: 10, g: 20, b: 30, active: true }]
		});

		await fireEvent.click(screen.getByRole('button', { name: 'Add color' }));
		const hexInput = screen.getByRole('textbox', { name: 'Hex color code' });

		await fireEvent.keyDown(hexInput, { key: 'Escape' });
		expect(screen.queryByRole('textbox', { name: 'Hex color code' })).toBeNull();
	});
});
