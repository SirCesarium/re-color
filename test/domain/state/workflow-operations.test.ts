import { describe, expect, test } from 'vitest';
import { createOperationScope } from '../../../src/lib/app/state/workflow/operations.ts';

describe('createOperationScope', () => {
	test('a freshly claimed signal stays live', () => {
		const scope = createOperationScope();

		const signal = scope.claimRun();

		expect(signal.aborted).toBe(false);
	});

	test('claiming a run aborts the signal the previous claim handed out', () => {
		const scope = createOperationScope();
		const first = scope.claimRun();

		scope.claimRun();

		expect(first.aborted).toBe(true);
	});

	test('the two lanes cancel independently', () => {
		const scope = createOperationScope();
		const run = scope.claimRun();
		const composition = scope.claimComposition();

		scope.abortRun();

		expect(run.aborted).toBe(true);
		expect(composition.aborted).toBe(false);
	});

	test('aborting an empty lane leaves the next claim live', () => {
		const scope = createOperationScope();

		scope.abortRun();
		scope.abortComposition();

		expect(scope.claimRun().aborted).toBe(false);
		expect(scope.claimComposition().aborted).toBe(false);
	});

	test('abortAll cancels both lanes at once', () => {
		const scope = createOperationScope();
		const run = scope.claimRun();
		const composition = scope.claimComposition();

		scope.abortAll();

		expect(run.aborted).toBe(true);
		expect(composition.aborted).toBe(true);
	});

	test('abortAll reaches runs claimed after an earlier abortAll', () => {
		const scope = createOperationScope();
		scope.abortAll();

		const signal = scope.claimRun();
		scope.abortAll();

		expect(signal.aborted).toBe(true);
	});
});
