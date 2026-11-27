import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { self } from '$app/service-worker';

const CACHE_PREFIX = 'cache-';
const CACHE = `${CACHE_PREFIX}${version}`;
const NAVIGATION_TIMEOUT_MS = 2000;

// Platform config, verification, SEO, and large/README-only media must not be
// precached: Cloudflare Pages returns 404 for /_headers, which aborts cache.addAll.
const EXCLUDED_PRECACHED_PATHS = new Set([
	'/_headers',
	'/robots.txt',
	'/sitemap.xml',
	'/og.png',
	'/google556ec09d3fb7f297.html',
	'/2ceb1a0f6c6c5472d46c1ac1af27c93e.txt',
	'/video/demo.mp4',
	'/img/demo-poster.png',
	'/img/exclude-pixels.png',
	'/img/language-switch.png',
	'/img/mapping-modes.png',
	'/img/session-restore.png',
	'/img/settings-panel.png'
]);

// Paths in $app/manifest are relative to the base path, so they need a
// leading slash to be comparable with url.pathname.
const toPathname = (path: string) => (path.startsWith('/') ? path : `/${path}`);

const ASSETS = [
	...immutable.map((file) => toPathname(file.path)),
	...assets.map((file) => toPathname(file.path)),
	...prerendered.map((page) => toPathname(page.path))
].filter((path) => !EXCLUDED_PRECACHED_PATHS.has(path));

const PRECACHED_PATHS = new Set(ASSETS);

const fetchWithTimeout = async (request: Request, timeoutMs: number): Promise<Response> => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		return await fetch(request, { signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
};

const matchCachedNavigation = async (
	cache: Cache,
	request: Request,
	pathname: string
): Promise<Response | undefined> => {
	const exact = await cache.match(request);
	if (exact) return exact;

	const byPath = await cache.match(pathname, { ignoreSearch: true });
	if (byPath) return byPath;

	if (!pathname.endsWith('/')) {
		const withSlash = await cache.match(`${pathname}/`, { ignoreSearch: true });
		if (withSlash) return withSlash;
	}

	return cache.match('/');
};

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			const previousCaches = keys.filter((key) => /^cache-\d+$/.test(key) && key !== CACHE);

			await Promise.all(previousCaches.map((key) => caches.delete(key)));
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	if (url.origin !== self.location.origin) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			const isNavigation = event.request.mode === 'navigate';

			if (!isNavigation && PRECACHED_PATHS.has(url.pathname)) {
				const cached = await cache.match(event.request);
				if (cached) return cached;
			}

			try {
				const request = isNavigation
					? new Request(event.request, { cache: 'no-cache' })
					: event.request;
				const response = isNavigation
					? await fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS)
					: await fetch(request);

				if (response.ok && !response.headers.get('cache-control')?.includes('no-store')) {
					await cache.put(event.request, response.clone());
				}

				if (isNavigation && !response.ok) {
					const cached = await matchCachedNavigation(cache, event.request, url.pathname);
					if (cached) return cached;
				}

				return response;
			} catch (error) {
				if (isNavigation) {
					const cached = await matchCachedNavigation(cache, event.request, url.pathname);
					if (cached) return cached;
				} else {
					const cached = await cache.match(event.request);
					if (cached) return cached;
				}

				throw error;
			}
		})()
	);
});
