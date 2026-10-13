import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

const lib = fileURLToPath(new URL('./src/lib', import.meta.url));
const app = fileURLToPath(new URL('./src/lib/app', import.meta.url));
const core = fileURLToPath(new URL('./src/lib/core', import.meta.url));

const sveltePlugin = svelte({
	compilerOptions: {
		runes: true
	}
});

const resolveConfig = {
	alias: {
		'#lib': lib,
		'#app': app,
		'#core': core
	},
	// Load Svelte's client build (which exports mount) instead of the
	// server one; without this, rendering under jsdom fails.
	conditions: ['browser']
};

/**
 * Two tiers, on purpose.
 *
 * `domain` runs under plain node with no DOM at all. That absence is the test:
 * it keeps the image-processing layer honest about browser dependencies and
 * keeps the suite fast. `ui` runs under jsdom for the reactive workflow and
 * the widgets, which genuinely need a document.
 *
 * Do not collapse them into one environment — a DOM in `domain` would quietly
 * let browser APIs leak into `src/lib/core/`.
 *
 * Inline projects inherit the plugins and aliases declared here, so neither
 * tier repeats them. To run `domain` without the Svelte plugin later, that
 * project needs `extends: false` plus its own plugin list.
 */
export default defineConfig({
	plugins: [sveltePlugin],
	resolve: resolveConfig,
	test: {
		projects: [
			{
				test: {
					name: 'domain',
					environment: 'node',
					include: ['test/domain/**/*.test.ts']
				}
			},
			{
				test: {
					name: 'ui',
					environment: 'jsdom',
					// @testing-library/svelte only wires its DOM cleanup through a
					// global afterEach, so without this the renders pile up across tests.
					globals: true,
					include: ['test/ui/**/*.test.ts'],
					setupFiles: ['test/ui/setup.ts']
				}
			}
		]
	}
});
