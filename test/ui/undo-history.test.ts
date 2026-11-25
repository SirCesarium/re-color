import { render } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { createRecolorWorkflow } from '../../src/lib/app/state/workflow/store.svelte.ts';

vi.mock('../../src/lib/core/image-processing/index.ts', () => import('./support/fake-engine.ts'));

import { resetFakeEngine } from './support/fake-engine.ts';
import WorkflowHarness from './support/WorkflowHarness.svelte';

type Workflow = ReturnType<typeof createRecolorWorkflow>;

describe('workflow undo/redo history', () => {
	beforeEach(() => {
		resetFakeEngine();
	});

	it('undoes and redoes color changes and pixel exclusions in order', () => {
		let workflow: Workflow | undefined;
		render(WorkflowHarness, {
			props: {
				onReady: (instance) => {
					workflow = instance;
				}
			}
		});
		if (!workflow) throw new Error('the harness never produced a workflow');

		const initialColors = [
			{ r: 255, g: 0, b: 0, active: true },
			{ r: 0, g: 255, b: 0, active: true }
		];
		workflow.state.colors = initialColors;

		// 1. Exclude a color
		workflow.recordColorChange(initialColors);
		workflow.state.colors = [
			{ r: 255, g: 0, b: 0, active: false },
			{ r: 0, g: 255, b: 0, active: true }
		];

		// 2. Exclude pixels via toggle and batch stroke
		workflow.toggleExcludedPixel(4);
		workflow.applyPixelPaint([5, 6], 'disable');

		expect(workflow.canUndo).toBe(true);
		expect(workflow.state.excludedPixels).toEqual([4, 5, 6]);
		expect(workflow.state.colors[0]?.active).toBe(false);

		// Undo batch pixel exclusion
		workflow.undo();
		expect(workflow.state.excludedPixels).toEqual([4]);

		// Undo single pixel toggle
		workflow.undo();
		expect(workflow.state.excludedPixels).toEqual([]);

		// Undo color exclusion
		workflow.undo();
		expect(workflow.state.colors[0]?.active).toBe(true);
		expect(workflow.canUndo).toBe(false);

		// Redo all three
		workflow.redo();
		expect(workflow.state.colors[0]?.active).toBe(false);
		workflow.redo();
		expect(workflow.state.excludedPixels).toEqual([4]);
		workflow.redo();
		expect(workflow.state.excludedPixels).toEqual([4, 5, 6]);
		expect(workflow.canRedo).toBe(false);
	});
});
