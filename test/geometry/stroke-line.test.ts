import { describe, expect, test } from 'bun:test';
import { linePoints } from '../../src/lib/geometry/stroke-line.ts';

describe('linePoints', () => {
	test('a horizontal line yields every point between the ends', () => {
		expect(linePoints({ x: 0, y: 3 }, { x: 3, y: 3 })).toEqual([
			{ x: 0, y: 3 },
			{ x: 1, y: 3 },
			{ x: 2, y: 3 },
			{ x: 3, y: 3 }
		]);
	});

	test('a vertical line yields every point between the ends', () => {
		expect(linePoints({ x: 2, y: 0 }, { x: 2, y: 2 })).toEqual([
			{ x: 2, y: 0 },
			{ x: 2, y: 1 },
			{ x: 2, y: 2 }
		]);
	});

	test('a diagonal line steps both axes without gaps', () => {
		expect(linePoints({ x: 0, y: 0 }, { x: 3, y: 3 })).toEqual([
			{ x: 0, y: 0 },
			{ x: 1, y: 1 },
			{ x: 2, y: 2 },
			{ x: 3, y: 3 }
		]);
	});

	test('a shallow diagonal steps mostly along the wider axis', () => {
		// From (0,0) to (4,2): 5 points, ending exactly on the target.
		const points = linePoints({ x: 0, y: 0 }, { x: 4, y: 2 });

		expect(points).toHaveLength(5);
		expect(points[0]).toEqual({ x: 0, y: 0 });
		expect(points.at(-1)).toEqual({ x: 4, y: 2 });
	});

	test('a reversed line still starts and ends on its endpoints', () => {
		const points = linePoints({ x: 4, y: 2 }, { x: 0, y: 0 });

		expect(points[0]).toEqual({ x: 4, y: 2 });
		expect(points.at(-1)).toEqual({ x: 0, y: 0 });
	});

	test('a zero-length line is a single point', () => {
		expect(linePoints({ x: 5, y: 5 }, { x: 5, y: 5 })).toEqual([
			{ x: 5, y: 5 }
		]);
	});
});
