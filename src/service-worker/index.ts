import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { self } from '$app/service-worker';

const CACHE = `cache-${version}`;

// Paths in $app/manifest are relative to the base path, so they need a
// leading slash to be comparable with url.pathname.
const toPathname = (path: string) => (path.startsWith('/') ? path : `/${path}`);

const ASSETS = [
	...immutable.map((file) => toPathname(file.path)),
	...assets.map((file) => toPathname(file.path)),
	...prerendered.map((page) => toPathname(page.path))
];

self.addEventListener('install', (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
		)
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);

	if (url.origin !== self.location.origin) return;

	event.respondWith(
		caches.open(CACHE).then(async (cache) => {
			if (ASSETS.includes(url.pathname)) {
				const cached = await cache.match(url.pathname);
				if (cached) return cached;
			}

			try {
				const response = await fetch(event.request);

				if (
					response.status === 200 &&
					!response.headers.get('cache-control')?.includes('no-store')
				) {
					void cache.put(event.request, response.clone());
				}

				return response;
			} catch {
				const cached = await cache.match(event.request);
				if (cached) return cached;
				throw new Error(`offline and uncached: ${url.pathname}`);
			}
		})
	);
});
