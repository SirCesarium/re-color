/** An RGB color with each channel represented by an integer from 0 to 255. */
export type Rgb = {
	/** Red channel. */
	r: number;
	/** Green channel. */
	g: number;
	/** Blue channel. */
	b: number;
};

/** A palette color that can be enabled or excluded from mapping. */
export type PaletteColor = Rgb & {
	/** Whether this color participates in the mapping strategy. */
	active: boolean;
};

/** Names of the built-in source-to-palette mapping algorithms. */
export type MappingMode = 'nearest' | 'luminance' | 'dominant';

/** Per-channel weights ordered as red, green, and blue. */
export type RgbWeights = readonly [number, number, number];

/** Parameters for choosing a built-in color-mapping algorithm or custom strategy. */
export type ColorMappingConfig = {
	/** Built-in algorithm to use unless `strategy` supplies a plugin. */
	mode: MappingMode;
	/** Per-channel multipliers used by nearest-color distance. */
	distanceWeights: RgbWeights;
	/** Per-channel luminance coefficients. */
	luminanceWeights: RgbWeights;
	/** Behavior when a rank-based algorithm has fewer target colors than source colors. */
	fallback: 'first-active' | 'unmapped';
	/** Optional custom strategy; async implementations can delegate to WebAssembly. */
	strategy?: ColorMappingStrategy;
};

/** Input passed to a mapping strategy after image pixels and palette are prepared. */
export type ColorMappingInput = {
	/** Unique source colors encoded as 0xRRGGBB integer keys. */
	keys: readonly number[];
	/** Active target colors, in their original palette order. */
	palette: readonly Rgb[];
	/** Number of eligible source pixels for each RGB key. */
	counts: ReadonlyMap<number, number>;
	/** Mapping settings excluding the custom strategy itself. */
	config: Omit<ColorMappingConfig, 'strategy'>;
	/** Lets async plugins stop expensive work when the owning operation is cancelled. */
	isCancelled: () => boolean;
};

/** Contract implemented by built-in and user-supplied color mapping plugins. */
export type ColorMappingStrategy = {
	/** Stable identifier for this strategy, useful for diagnostics and plugin registries. */
	readonly id: string;
	/**
	 * Creates the source-to-target lookup used to recolor pixels.
	 *
	 * Return a color for each source key that should be recolored. Omitted keys
	 * are left unchanged. An asynchronous implementation can use a Worker or
	 * WebAssembly module; reject the promise to report a plugin failure.
	 *
	 * @param input Source colors, active palette, pixel counts, settings, and cancellation hook.
	 * @returns A lookup map, or a promise that resolves to one.
	 */
	createLookup(
		input: ColorMappingInput
	): ReadonlyMap<number, Rgb> | Promise<ReadonlyMap<number, Rgb>>;
};

/** Controls how colors are counted and filtered while building a palette from an image. */
export type PaletteExtractionConfig = {
	/** Maximum number of distinct colors returned. */
	maxColors: number;
	/** Pixels whose alpha is below this value are excluded; the threshold is in the 0-255 range. */
	alphaThreshold: number;
};

/** Controls which sprite pixels are eligible and how output alpha is written. */
export type TransparencyConfig = {
	/** Pixels whose alpha is below this value are not counted or recolored. */
	minAlpha: number;
	/** Preserve each eligible pixel's original alpha instead of replacing it. */
	preserveAlpha: boolean;
	/** Alpha assigned to recolored pixels when `preserveAlpha` is false. */
	opaqueAlpha: number;
};

/** Progress fractions emitted at the major stages of a recolor operation. */
export type ProgressConfig = {
	/** Emitted before image loading begins. */
	start: number;
	/** Emitted after the source image is decoded. */
	imageLoaded: number;
	/** Emitted after source pixels are read and counted. */
	pixelsRead: number;
	/** Emitted after recoloring is complete and before encoding. */
	processingComplete: number;
	/** Emitted after the encoded object URL is ready. */
	complete: number;
};

/**
 * Complete set of options required by {@link recolorSprite}.
 *
 * Callers provide every field explicitly; the engine does not merge defaults.
 * Application-level presets can be composed and overridden before invocation.
 */
export type RecolorConfig = {
	/** Browser canvas settings used while reading and writing image pixels. */
	canvas: {
		/** Hint that the canvas will be read frequently. */
		willReadFrequently: boolean;
		/** Color space used for the canvas pixel data. */
		colorSpace: PredefinedColorSpace;
	};
	/** Color mapping algorithm and its tunable parameters. */
	mapping: ColorMappingConfig;
	/** Alpha handling for sprite pixels. */
	transparency: TransparencyConfig;
	/** Scheduling, progress, and cancellation settings for pixel processing. */
	processing: {
		/** Maximum time spent processing rows before yielding to the browser. */
		chunkDurationMs: number;
		/** Progress milestones, expressed as ordered fractions from zero to one. */
		progress: ProgressConfig;
		/** Scheduling hook called between chunks; can be replaced by a worker scheduler. */
		yieldToMain: () => Promise<void>;
		/** Receives progress fractions defined by `progress`. */
		onProgress: (fraction: number) => void;
		/** Returns true to cancel the active operation. */
		isCancelled: () => boolean;
	};
	/** Encoded result format and optional encoder quality. */
	output: {
		/** Requested browser canvas encoding MIME type. */
		mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
		/** Encoder quality from 0 to 1; used by lossy formats. */
		quality?: number;
	};
};
