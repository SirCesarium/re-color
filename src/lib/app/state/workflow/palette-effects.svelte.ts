import { untrack } from 'svelte';
import { extractColorsFromFile, type PaletteColor } from '#core/image-processing/index.ts';
import { CANVAS_CONFIG, PALETTE_CONFIG } from '#core/recolor.ts';
import { settings } from '../settings/store.svelte.ts';

/** The slice of workflow state the palette effect reads and writes. */
type PaletteHost = {
	palette: File | null;
	colors: PaletteColor[];
	paletteColorsLoaded: boolean;
	hint: string | null;
};

/**
 * Re-extracts the palette's colors whenever the palette image or the
 * `maxPaletteColors` setting changes. It deliberately touches neither the
 * cancellation counters nor the result object URLs — that is why it lives
 * apart from the rest of the workflow orchestration.
 *
 * A surviving color keeps its `active` toggle across a re-extraction, so
 * lowering the cap (or reloading the same image) does not silently re-enable
 * colors the user switched off.
 */
export function watchPaletteColors(state: PaletteHost): void {
	$effect(() => {
		const file = state.palette;
		const maxColors = settings.maxPaletteColors;

		if (!file) {
			state.colors = [];
			state.paletteColorsLoaded = false;

			return;
		}

		let cancelled = false;
		state.paletteColorsLoaded = false;
		const previousColors = untrack(() => state.colors);

		void extractColorsFromFile(file, { ...PALETTE_CONFIG, maxColors }, CANVAS_CONFIG)
			.then((colors) => {
				if (cancelled) return;

				state.colors = colors.map((color) => {
					const previous = previousColors.find(
						(candidate) =>
							candidate.r === color.r && candidate.g === color.g && candidate.b === color.b
					);

					return previous ? { ...color, active: previous.active } : color;
				});
				state.paletteColorsLoaded = true;
			})
			.catch((error: unknown) => {
				if (cancelled) return;

				console.error('Could not extract the palette image colors', error);
				state.colors = [];
				state.paletteColorsLoaded = false;
				state.hint = 'workflow.paletteFailed';
			});

		return () => {
			cancelled = true;
		};
	});
}
