/** Formats an RGB color as a CSS `rgb()` string. */
export { cssRgb } from './color/format.ts';
/** Recolors a sprite with an explicit palette and config. */
export { recolorSprite } from './engine.ts';
/** Canvas options shared by the browser-side helpers. */
export type { CanvasConfig } from './image/canvas.ts';
/** Paints the excluded original pixels back over an already-recolored image. */
export { composeExcludedPixels } from './image/canvas.ts';
/** Hands the browser a break between processing chunks. */
export { yieldToBrowser } from './image/scheduler.ts';
/** Checks an upload against the size, PNG-signature, and dimension limits. */
export {
	type ValidationCode,
	ValidationError,
	validateImageFile
} from './image/validation.ts';
/** Picks the most frequent colors of an image as a palette. */
/** Same, but from a file, reading PNG samples raw to dodge color management. */
export { extractColors, extractColorsFromFile } from './palette.ts';
/** Public types: colors, palettes, mapping, plugins, and processing config. */
export type {
	ColorMappingConfig,
	ColorMappingInput,
	ColorMappingStrategy,
	MappingMode,
	PaletteColor,
	PaletteExtractionConfig,
	RecolorConfig,
	Rgb,
	RgbWeights,
	TransparencyConfig
} from './types.ts';
