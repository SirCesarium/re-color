import { describe, expect, it } from 'vitest';
import { paintExclusions } from '../../src/lib/app/state/workflow/paint.ts';

describe('paintExclusions', () => {
	it('forces pixels off and on without duplicating entries', () => {
		expect(paintExclusions([2, 4], [4, 5, 5], 'disable')).toEqual([2, 4, 5]);
		expect(paintExclusions([2, 4], [2, 3, 3], 'enable')).toEqual([4]);
	});

	it('flips every touched pixel independently in toggle mode', () => {
		expect(paintExclusions([2, 4], [2, 3], 'toggle')).toEqual([3, 4]);
	});

	it('returns null when the stroke changes nothing', () => {
		expect(paintExclusions([2], [2], 'disable')).toBeNull();
		expect(paintExclusions([2], [3], 'enable')).toBeNull();
		expect(paintExclusions([2], [], 'toggle')).toBeNull();
	});

	it('ignores invalid indexes', () => {
		expect(paintExclusions([], [-1, 1.5, 2], 'disable')).toEqual([2]);
	});
});
