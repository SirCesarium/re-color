import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import ImageInputs from '../../src/lib/app/widgets/ImageInputs.svelte';

describe('ImageInputs', () => {
	it('surfaces the domain rejection message above the drop target', async () => {
		const { container } = render(ImageInputs, { palette: null, sprite: null });

		const textFile = new File(['plain text, not a png'], 'sprite.png', {
			type: 'image/png'
		});
		const paletteZone = container.querySelectorAll('label')[0];

		if (!paletteZone) throw new Error('expected a palette drop zone');

		await fireEvent.drop(paletteZone, { dataTransfer: { files: [textFile] } });

		await waitFor(() => {
			expect(screen.getAllByRole('alert')[0].textContent).toBe('Choose a valid PNG image.');
		});
	});
});
