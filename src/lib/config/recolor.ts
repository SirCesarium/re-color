import type { CanvasConfig } from '../image-processing/image/canvas.ts';
import { yieldToBrowser } from '../image-processing/image/scheduler.ts';
import type {
	ColorMappingConfig,
	MappingMode,
	PaletteExtractionConfig,
	RecolorConfig,
	TransparencyConfig
} from '../image-processing/types.ts';

export const MAPPING_STORAGE_KEY = 'recolor.mapping';

export const PALETTE_CONFIG: PaletteExtractionConfig = {
	maxColors: 64,
	alphaThreshold: 128
};

export const CANVAS_CONFIG: CanvasConfig = {
	willReadFrequently: true,
	colorSpace: 'srgb'
};

export const MAPPING_CONFIG: Omit<ColorMappingConfig, 'strategy'> = {
	mode: 'luminance',
	distanceWeights: [2, 4, 3],
	luminanceWeights: [0.2126, 0.7152, 0.0722],
	fallback: 'first-active'
};

export const TRANSPARENCY_CONFIG: TransparencyConfig = {
	minAlpha: 1,
	preserveAlpha: true,
	opaqueAlpha: 255
};

export const PROCESSING_CONFIG: Omit<
	RecolorConfig['processing'],
	'onProgress' | 'isCancelled'
> = {
	chunkDurationMs: 6,
	progress: {
		start: 0,
		imageLoaded: 0.05,
		pixelsRead: 0.1,
		processingComplete: 0.9,
		complete: 1
	},
	yieldToMain: yieldToBrowser
};

export const OUTPUT_CONFIG: RecolorConfig['output'] = {
	mimeType: 'image/png'
};

export const OUTPUT_EXTENSIONS: Record<RecolorConfig['output']['mimeType'], string> = {
	'image/png': 'png',
	'image/jpeg': 'jpg',
	'image/webp': 'webp'
};

export const MAPPING_OPTIONS: { value: MappingMode; label: string }[] = [
	{ value: 'nearest', label: 'Nearest color' },
	{ value: 'luminance', label: 'Luminance order' },
	{ value: 'dominant', label: 'Dominant color' }
];
