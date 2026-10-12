import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
// Registers the message catalogs and the locale so $t resolves real text.
import '../src/lib/app/i18n/index.ts';
import DropZoneHarness from './support/DropZoneHarness.svelte';

const textFile = new File(['plain text, not a png'], 'sprite.png', {
	type: 'image/png'
});

async function dropFirstFile(container: Element) {
	const zone = container.querySelector('label');

	if (!zone) throw new Error('expected the drop zone label to render');

	await fireEvent.drop(zone, { dataTransfer: { files: [textFile] } });
}

describe('DropZone', () => {
	it('shows the message key the validator resolved and keeps the zone empty', async () => {
		const validate = async () => 'validation.tooBig';

		const { container } = render(DropZoneHarness, { validate });

		await dropFirstFile(container);

		await waitFor(() => {
			expect(screen.getByRole('alert').textContent).toBe(
				'Image dimensions must not exceed 512 × 512 pixels.'
			);
		});

		expect(screen.getByTestId('accepted').textContent).toBe('empty');
	});

	it('accepts the file when the validator resolves null', async () => {
		const validate = async () => null;

		const { container } = render(DropZoneHarness, { validate });

		await dropFirstFile(container);

		await waitFor(() => {
			expect(screen.getByTestId('accepted').textContent).toBe('accepted');
		});
	});
});
