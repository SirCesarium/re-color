/** Yields between processing chunks using the browser Scheduler API when available. */
export { yieldToBrowser } from './image/scheduler.ts';
/** Composes excluded source pixels into an already-recolored image without remapping colors. */
export { composeExcludedPixels } from './image/canvas.ts';
/** Converts RGB channel values to a CSS `rgb()` color string. */
export { cssRgb } from './color/format.ts';
/** Samples the most frequent colors from a decoded image. */
export { extractColors } from './palette.ts';
/** Samples a file using raw PNG samples when available, independent of browser color management. */
export { extractColorsFromFile } from './palette.ts';
/** Recolors an image using an explicit palette and processing configuration. */
export { recolorSprite } from './engine.ts';
/** Canvas settings and image resource types used by the browser adapters. */
export type { CanvasConfig } from './image/canvas.ts';
/** Public color, palette, mapping, plugin, and processing configuration types. */
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
