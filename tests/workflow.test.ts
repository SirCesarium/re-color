import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { createRecolorWorkflow } from '../src/lib/state/recolor-workflow.svelte.ts';
import WorkflowHarness from './support/WorkflowHarness.svelte';

type Workflow = ReturnType<typeof createRecolorWorkflow>;

/** Mounts the workflow in a harness and hands the live object to the test. */
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

describe('recolor workflow', () => {
	it('starts idle with no sprite, palette, or result', async () => {
		const { workflow } = mountWorkflow();

		// onMount kicks off an async workspace restore; let it settle.
		await new Promise(resolve => setTimeout(resolve, 0));

		expect(workflow.state.busy).toBe(false);
		expect(workflow.state.sprite).toBeNull();
		expect(workflow.state.palette).toBeNull();
		expect(workflow.state.result).toBeNull();
		expect(workflow.ready).toBe(false);
		expect(workflow.state.excludedPixels).toEqual([]);
	});
});
