import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { createRecolorWorkflow } from '../src/lib/app/state/workflow/store.svelte.ts';

// The workflow drives the real engine, which paints pixels on a canvas jsdom
// cannot provide. Swap it for controllable fakes so orchestration, timing, and
// URL handling can be exercised deterministically.
vi.mock(
	'../src/lib/core/image-processing/index.ts',
	() => import('./support/fake-engine.ts')
);

import {
	settings,
	updateSetting
} from '../src/lib/app/state/settings/store.svelte.ts';
import {
	composeExcludedPixels,
	deferred,
	recolorSprite,
	resetFakeEngine
} from './support/fake-engine.ts';
import { revokedObjectUrls } from './support/object-urls.ts';
import WorkflowHarness from './support/WorkflowHarness.svelte';

type Workflow = ReturnType<typeof createRecolorWorkflow>;

/** Flushes Svelte effects and pending microtasks/timers a few times over. */
async function settle(): Promise<void> {
	for (let i = 0; i < 6; i++) {
		await tick();
		await new Promise(resolve => setTimeout(resolve, 0));
	}
}

function mountWorkflow(): { workflow: Workflow } {
	let workflow: Workflow | undefined;

	render(WorkflowHarness, {
		props: {
			onReady: instance => {
				workflow = instance;
			}
		}
	});

	if (!workflow) throw new Error('the harness never produced a workflow');

	return { workflow };
}

function pngFile(name: string): File {
	return new File(['png'], name, { type: 'image/png' });
}

/** Gives the workflow a palette and a sprite so it becomes ready. */
function loadInputs(workflow: Workflow): void {
	workflow.state.palette = pngFile('palette.png');
	workflow.state.sprite = pngFile('sprite.png');
}

beforeEach(() => {
	resetFakeEngine();
});

describe('recolor workflow', () => {
	it('starts idle with no sprite, palette, or result', async () => {
		const { workflow } = mountWorkflow();

		await settle();

		expect(workflow.state.busy).toBe(false);
		expect(workflow.state.sprite).toBeNull();
		expect(workflow.state.palette).toBeNull();
		expect(workflow.state.result).toBeNull();
		expect(workflow.ready).toBe(false);
		expect(workflow.state.excludedPixels).toEqual([]);
	});

	it('runs an initial recolor once the inputs are ready', async () => {
		const { workflow } = mountWorkflow();

		await settle();
		loadInputs(workflow);
		await settle();

		expect(workflow.ready).toBe(true);
		expect(workflow.state.result).not.toBeNull();
		expect(workflow.state.busy).toBe(false);
	});

	it('releases the previous result URLs when a new recolor lands', async () => {
		const { workflow } = mountWorkflow();

		await settle();
		loadInputs(workflow);
		await settle();

		// The first run's preview URL, captured before triggering a second run.
		const firstUrl = workflow.state.result?.previewUrl;

		expect(firstUrl).toBeDefined();

		// A mapping change with autoRecolor on kicks off a second run.
		workflow.state.mapping = 'nearest';
		await settle();

		const secondUrl = workflow.state.result?.previewUrl;

		expect(secondUrl).toBeDefined();
		expect(secondUrl).not.toBe(firstUrl);
		expect(revokedObjectUrls()).toContain(firstUrl);
		expect(revokedObjectUrls()).not.toContain(secondUrl);
	});

	it('cancels an in-flight recolor and releases its orphaned URL', async () => {
		const { workflow } = mountWorkflow();

		await settle();

		// Hold the recolor open so we can cancel while it is mid-flight.
		const pending = deferred<string>();
		recolorSprite.mockReturnValue(pending.promise);

		loadInputs(workflow);
		await settle();

		expect(workflow.state.busy).toBe(true);

		// Cancel while the run is still awaiting the engine.
		workflow.clearFormData();

		// The engine answers late, but the run is stale: its URL must be
		// released rather than published as a result.
		const orphanUrl = URL.createObjectURL();
		pending.resolve(orphanUrl);
		await settle();

		expect(workflow.state.result).toBeNull();
		expect(workflow.state.busy).toBe(false);
		expect(revokedObjectUrls()).toContain(orphanUrl);
	});

	it('an exclusion recompose revokes the URL it replaced', async () => {
		const { workflow } = mountWorkflow();

		await settle();
		loadInputs(workflow);
		await settle();

		// Each recomposition produces a fresh URL, the way the real encoder would.
		composeExcludedPixels.mockImplementation(async () => URL.createObjectURL());

		workflow.toggleExcludedPixel(0);
		await settle();

		const firstComposed = workflow.state.result?.url;
		const preview = workflow.state.result?.previewUrl;

		expect(firstComposed).toBeDefined();
		expect(preview).toBeDefined();

		workflow.toggleExcludedPixel(1);
		await settle();

		// The replaced composition dies; the preview (the compose base) and the
		// current composition stay alive.
		expect(revokedObjectUrls()).toContain(firstComposed);
		expect(revokedObjectUrls()).not.toContain(preview);
		expect(workflow.state.result?.url).not.toBe(firstComposed);
		expect(workflow.state.result?.previewUrl).toBe(preview);
	});

	it('clearFormData cancels an in-flight exclusion composition', async () => {
		const { workflow } = mountWorkflow();

		await settle();
		loadInputs(workflow);
		await settle();

		// Hold the recomposition open so we can clear while it is mid-flight.
		const pending = deferred<string>();
		composeExcludedPixels.mockReturnValue(pending.promise);

		workflow.toggleExcludedPixel(0);
		await settle();

		expect(composeExcludedPixels).toHaveBeenCalledTimes(1);
		expect(workflow.state.result).not.toBeNull();

		workflow.clearFormData();

		// The engine answers late, but the composition was superseded: its URL
		// must be released rather than published.
		const orphanUrl = URL.createObjectURL();
		pending.resolve(orphanUrl);
		await settle();

		expect(workflow.state.result).toBeNull();
		expect(workflow.state.busy).toBe(false);
		expect(revokedObjectUrls()).toContain(orphanUrl);
	});

	it('changing the sprite invalidates the run in flight', async () => {
		const { workflow } = mountWorkflow();

		await settle();

		// Hold the first recolor open so a new input can supersede it.
		const pending = deferred<string>();
		recolorSprite.mockReturnValue(pending.promise);

		loadInputs(workflow);
		await settle();

		expect(workflow.state.busy).toBe(true);

		// Swap the engine back before changing the input, so the replacement run
		// gets a fresh URL while the old run still awaits its own promise.
		recolorSprite.mockImplementation(async () => URL.createObjectURL());

		workflow.state.sprite = pngFile('sprite-2.png');
		await settle();

		const orphanUrl = URL.createObjectURL();
		pending.resolve(orphanUrl);
		await settle();

		// The late answer belongs to the superseded run: it is released, never
		// published as the result.
		expect(revokedObjectUrls()).toContain(orphanUrl);
		expect(workflow.state.result).toBeNull();
		expect(workflow.state.busy).toBe(false);
	});

	it('a mapping change saves the new mode as the startup default', async () => {
		// Arrange: start from a known default so the assertion cannot ride a
		// leftover value another test left behind.
		updateSetting('defaultMapping', 'luminance');

		const { workflow } = mountWorkflow();

		await settle();
		loadInputs(workflow);
		await settle();

		workflow.state.mapping = 'dominant';
		await settle();

		expect(settings.defaultMapping).toBe('dominant');
	});
});
