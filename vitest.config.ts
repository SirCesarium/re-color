import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

const lib = fileURLToPath(new URL('./src/lib', import.meta.url));

// Svelte-facing tests (the reactive workflow, widgets) run here under a DOM.
// The pure domain stays in `bun test` with no DOM, which keeps those tests
// fast and guards the image-processing layer against browser dependencies.
export default defineConfig({
	plugins: [
		svelte({
			compilerOptions: {
				runes: true
			}
		})
	],
	resolve: {
		alias: {
			'#lib': lib
		},
		// Load Svelte's client build (which exports mount) instead of the
		// server one; without this, rendering under jsdom fails.
		conditions: ['browser']
	},
	test: {
		environment: 'jsdom',
		globals: true,
		include: ['tests/**/*.test.ts'],
		setupFiles: ['tests/setup.ts']
	}
});
