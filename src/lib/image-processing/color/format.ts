import type { Rgb } from '../types.ts';

/**
 * Formats an RGB color as a CSS Color 4 `rgb()` string.
 *
 * @param color RGB channels to format.
 * @returns A CSS color string such as `rgb(20 40 60)`.
 */
export function cssRgb(color: Rgb): string {
	return `rgb(${color.r} ${color.g} ${color.b})`;
}
