import { execFileSync } from 'node:child_process';
import type { RequestHandler } from './$types';

const SITE_URL = 'https://recolor.pages.dev';
const PAGES = ['/', '/privacy/'];

export const prerender = true;

function gitDate(): string | null {
	try {
		const date = execFileSync('git', ['log', '-1', '--format=%cs'], {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore']
		}).trim();

		return date || null;
	} catch {
		return null;
	}
}

function lastModified(): string {
	return gitDate() ?? new Date().toISOString().slice(0, 10);
}

export const GET: RequestHandler = () => {
	const lastmod = lastModified();

	const urls = PAGES.map(
		(path) => `	<url>
		<loc>${SITE_URL}${path}</loc>
		<lastmod>${lastmod}</lastmod>
	</url>`
	).join('\n');

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

	return new Response(body, {
		headers: { 'content-type': 'application/xml; charset=utf-8' }
	});
};
