import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { self } from '$app/service-worker';

const CACHE_PREFIX = 'cache-';
const CACHE = `${CACHE_PREFIX}${version}`;

// Paths in $app/manifest are relative to the base path, so they need a
// leading slash to be comparable with url.pathname.
const toPathname = (path: string) => (path.startsWith('/') ? path : `/${path}`);

const ASSETS = [
	...immutable.map((file) => toPathname(file.path)),
	...assets.map((file) => toPathname(file.path)),
	...prerendered.map((page) => toPathname(page.path))
];
const PRECACHED_PATHS = new Set(ASSETS);

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
			const previousCaches = keys.filter(
				(key) => /^cache-\d+$/.test(key) && key !== CACHE
			);

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
				const response = await fetch(request);

				if (response.ok && !response.headers.get('cache-control')?.includes('no-store')) {
					await cache.put(event.request, response.clone());
				}

				return response;
			} catch (error) {
				const cached = await cache.match(event.request);
				if (cached) return cached;

				if (isNavigation) {
					const precachedPage = await cache.match(url.pathname);
					if (precachedPage) return precachedPage;
				}

				throw error;
			}
		})()
	);
});
