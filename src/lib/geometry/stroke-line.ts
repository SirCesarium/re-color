/**
 * Bresenham's line algorithm, extracted so a drag stroke can paint every pixel
 * between two points without gaps.
 *
 * Pure integer math; no canvas, no DOM. The caller decides what to do with the
 * points (PixelCanvas turns them into linear indexes to repaint).
 */

export type Point = { x: number; y: number };

/**
 * Walks the line from `from` to `to`, inclusive, and returns every point it
 * passes through.
 *
 * @param from Line start.
 * @param to Line end.
 * @returns The points along the line, starting at `from` and ending at `to`.
 */
export function linePoints(from: Point, to: Point): Point[] {
	const points: Point[] = [];

	let x = from.x;
	let y = from.y;

	// The algorithm only ever steps one axis at a time by these signs.
	const stepX = from.x < to.x ? 1 : -1;
	const stepY = from.y < to.y ? 1 : -1;

	const dx = Math.abs(to.x - from.x);
	const dy = -Math.abs(to.y - from.y);

	// Error term decides, at each step, whether to step the other axis too.
	let error = dx + dy;

	while (true) {
		points.push({ x, y });

		if (x === to.x && y === to.y) break;

		const doubledError = 2 * error;

		if (doubledError >= dy) {
			error += dy;
			x += stepX;
		}

		if (doubledError <= dx) {
			error += dx;
			y += stepY;
		}
	}

	return points;
}
