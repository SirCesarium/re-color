import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import TopBar from '../../src/lib/app/widgets/TopBar.svelte';

describe('TopBar', () => {
	it('is inert while it is off screen', () => {
		const { container } = render(TopBar);

		const header = container.querySelector('header');

		expect(header?.inert).toBe(true);
	});

	it('links to every content section', () => {
		render(TopBar, { visible: true });

		const hrefs = screen
			.getAllByRole('link')
			.map((link) => link.getAttribute('href'))
			.filter((href) => href?.startsWith('#'));

		expect(hrefs).toEqual(['#how', '#examples', '#limits']);
	});

	it('keeps GitHub and privacy reachable', () => {
		render(TopBar, { visible: true });

		const source = screen.getByRole('link', { name: 'GitHub' });

		expect(source.getAttribute('href')).toBe('https://github.com/SirCesarium/re-color');
		expect(source.getAttribute('target')).toBe('_blank');

		expect(screen.getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe('/privacy/');
	});
});
