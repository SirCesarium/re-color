/** An RGB color, channels as integers from 0 to 255. */
export type Rgb = {
	r: number;
	g: number;
	b: number;
};

/** A palette color the user can toggle off to keep it out of the mapping. */
export type PaletteColor = Rgb & {
	/** Inactive colors are never offered to the mapping strategy. */
	active: boolean;
};

export type MappingMode = 'nearest' | 'luminance' | 'dominant';

/** Per-channel weights ordered as red, green, and blue. */
export type RgbWeights = readonly [number, number, number];

/** Algorithm choice plus the knobs each one understands. */
export type ColorMappingConfig = {
	/** Built-in algorithm to use unless `strategy` supplies a plugin. */
	mode: MappingMode;
	/** Per-channel multipliers used by nearest-color distance. */
	distanceWeights: RgbWeights;
	/** Per-channel luminance coefficients. */
	luminanceWeights: RgbWeights;
	/** What to do when a rank-based algorithm runs out of palette colors. */
	fallback: 'first-active' | 'unmapped';
	/** Custom strategy; async implementations can delegate to WebAssembly or a worker. */
	strategy?: ColorMappingStrategy;
};

/** What a mapping strategy gets to work with once the pixels are prepared. */
export type ColorMappingInput = {
	/** Unique source colors encoded as 0xRRGGBB integer keys. */
	keys: readonly number[];
	/** Active target colors, in their original palette order. */
	palette: readonly Rgb[];
	/** Number of eligible source pixels for each RGB key. */
	counts: ReadonlyMap<number, number>;
	/** Mapping settings excluding the custom strategy itself. */
	config: Omit<ColorMappingConfig, 'strategy'>;
	/** Lets a slow plugin notice the operation was cancelled and bail out. */
	isCancelled: () => boolean;
};

/** The contract every mapping strategy, built-in or third-party, implements. */
export type ColorMappingStrategy = {
	/** Stable identifier for this strategy, useful for diagnostics and plugin registries. */
	readonly id: string;
	/**
	 * Creates the source-to-target lookup used to recolor pixels.
	 *
	 * Return a color for each source key that should change; leave a key out to
	 * keep its original pixels. Async implementations (a Worker, a WebAssembly
	 * module) may return a promise; reject it to report a plugin failure.
	 *
	 * @param input Source colors, active palette, pixel counts, settings, and cancellation hook.
	 * @returns A lookup map, or a promise that resolves to one.
	 */
	createLookup(
		input: ColorMappingInput
	): ReadonlyMap<number, Rgb> | Promise<ReadonlyMap<number, Rgb>>;
};

/** Knobs for turning an image into a palette. */
export type PaletteExtractionConfig = {
	/** Maximum number of distinct colors returned. */
	maxColors: number;
	/** Pixels below this alpha (0-255) don't get counted at all. */
	alphaThreshold: number;
};

/** Decides which sprite pixels we repaint and what happens to their alpha. */
export type TransparencyConfig = {
	/** Pixels below this alpha are neither counted nor recolored. */
	minAlpha: number;
	/** Keep each pixel's own alpha instead of overwriting it. */
	preserveAlpha: boolean;
	/** Alpha written to repainted pixels when `preserveAlpha` is false. */
	opaqueAlpha: number;
};

/** The progress numbers emitted at each stage of a recolor. */
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
 * Every option {@link recolorSprite} needs.
 *
 * Callers fill in each field; the engine never merges defaults of its own, so
 * application-level presets are composed and overridden before the call.
 */
export type RecolorConfig = {
	/** Canvas settings used while reading and writing pixels. */
	canvas: {
		/** True when we read pixels back often; lets the browser skip a GPU copy. */
		willReadFrequently: boolean;
		/** Color space for the canvas bitmap. */
		colorSpace: PredefinedColorSpace;
	};
	/** Mapping algorithm and its knobs. */
	mapping: ColorMappingConfig;
	/** Alpha handling for sprite pixels. */
	transparency: TransparencyConfig;
	/** Linear pixel indexes to leave untouched instead of repainting. */
	excludedPixels?: ReadonlySet<number>;
	/** Scheduling, progress, and cancellation for the pixel loop. */
	processing: {
		/** How long the loop runs before it yields back to the browser. */
		chunkDurationMs: number;
		/** Progress milestones as ordered fractions from zero to one. */
		progress: ProgressConfig;
		/** Called between chunks; swap it out to schedule from a worker instead. */
		yieldToMain: () => Promise<void>;
		/** Receives the fractions defined by `progress`. */
		onProgress: (fraction: number) => void;
		/** Returns true to cancel the active operation. */
		isCancelled: () => boolean;
	};
	/** Result format and encoder quality. */
	output: {
		/** MIME type the browser encoder is asked for. */
		mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
		/** From 0 to 1; only the lossy formats use it. */
		quality?: number;
	};
};
