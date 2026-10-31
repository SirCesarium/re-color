import { expect, test } from 'vitest';
import { recolorSprite } from '../../../src/lib/core/image-processing/engine.ts';
import { extractColorsFromFile } from '../../../src/lib/core/image-processing/palette.ts';
import type { RecolorConfig } from '../../../src/lib/core/image-processing/types.ts';
import {
	CANVAS_CONFIG,
	MAPPING_CONFIG,
	OUTPUT_CONFIG,
	PROCESSING_CONFIG,
	TRANSPARENCY_CONFIG
} from '../../../src/lib/core/recolor.ts';

const invalidFile = new File(['x'], 'sprite.png', { type: 'image/png' });
const canvasConfig = { willReadFrequently: true, colorSpace: 'srgb' as const };

function baseConfig(): RecolorConfig {
	return {
		// Copied, not referenced: a test poisons `willReadFrequently` and must
		// not leak that into every later config through the shared constant.
		canvas: { ...CANVAS_CONFIG },
		mapping: { ...MAPPING_CONFIG },
		transparency: { ...TRANSPARENCY_CONFIG },
		processing: {
			...PROCESSING_CONFIG,
			onProgress: () => {},
			signal: new AbortController().signal
		},
		output: { ...OUTPUT_CONFIG }
	};
}

async function expectRejectedConfig(
	mutate: (config: RecolorConfig) => void,
	message: string
): Promise<void> {
	const config = baseConfig();
	mutate(config);

	await expect(recolorSprite(invalidFile, [], config)).rejects.toThrow(message);
}

test('rejects transparency bytes outside the 0-255 range', async () => {
	await expectRejectedConfig((config) => {
		config.transparency.minAlpha = 300;
	}, 'transparency.minAlpha must be an integer between zero and 255');
	await expectRejectedConfig((config) => {
		config.transparency.opaqueAlpha = -1;
	}, 'transparency.opaqueAlpha must be an integer between zero and 255');
	await expectRejectedConfig((config) => {
		config.transparency.opaqueAlpha = 12.5;
	}, 'transparency.opaqueAlpha must be an integer between zero and 255');
});

test('rejects a chunk duration that is not a positive finite number', async () => {
	await expectRejectedConfig((config) => {
		config.processing.chunkDurationMs = 0;
	}, 'processing.chunkDurationMs must be greater than zero');
	await expectRejectedConfig((config) => {
		config.processing.chunkDurationMs = Number.POSITIVE_INFINITY;
	}, 'processing.chunkDurationMs must be greater than zero');
});

test('rejects progress milestones that are out of range or unordered', async () => {
	await expectRejectedConfig((config) => {
		config.processing.progress = { ...config.processing.progress, complete: 2 };
	}, 'processing.progress values must be ordered fractions between zero and one');
	await expectRejectedConfig((config) => {
		config.processing.progress = {
			...config.processing.progress,
			start: 0.9,
			complete: 0.1
		};
	}, 'processing.progress values must be ordered fractions between zero and one');
	await expectRejectedConfig((config) => {
		config.processing.progress = {
			...config.processing.progress,
			pixelsRead: Number.NaN
		};
	}, 'processing.progress values must be ordered fractions between zero and one');
});

test('rejects negative or non-finite mapping weights', async () => {
	await expectRejectedConfig((config) => {
		config.mapping.distanceWeights = [2, -1, 3];
	}, 'mapping.distanceWeights[1] must be non-negative');
	await expectRejectedConfig((config) => {
		config.mapping.luminanceWeights = [Number.NaN, 0.7152, 0.0722];
	}, 'mapping.luminanceWeights[0] must be non-negative');
});

test('rejects an output quality outside zero and one', async () => {
	await expectRejectedConfig((config) => {
		config.output.quality = 1.5;
	}, 'output.quality must be between zero and one');
});

test('accepts the default processing configuration', async () => {
	// The invalid file proves the config passed validation: decoding fails next.
	await expect(recolorSprite(invalidFile, [], baseConfig())).rejects.toMatchObject({
		code: 'notPng'
	});
});

test('rejects invalid palette extraction values', async () => {
	await expect(
		extractColorsFromFile(new Blob(['x']), { maxColors: -1, alphaThreshold: 128 }, canvasConfig)
	).rejects.toThrow('maxColors must be a non-negative integer');
	await expect(
		extractColorsFromFile(new Blob(['x']), { maxColors: 1.5, alphaThreshold: 128 }, canvasConfig)
	).rejects.toThrow('maxColors must be a non-negative integer');
	await expect(
		extractColorsFromFile(new Blob(['x']), { maxColors: 64, alphaThreshold: 256 }, canvasConfig)
	).rejects.toThrow('alphaThreshold must be an integer between zero and 255');
});

/** Simulates tampered configs that bypass the tuple types. */
function untypedWeights(values: number[]): typeof MAPPING_CONFIG.distanceWeights {
	return values as unknown as typeof MAPPING_CONFIG.distanceWeights;
}

test('rejects mapping weights that do not hold exactly three entries', async () => {
	await expectRejectedConfig((config) => {
		config.mapping.distanceWeights = untypedWeights([]);
	}, 'mapping.distanceWeights must contain exactly 3 entries');
	await expectRejectedConfig((config) => {
		config.mapping.luminanceWeights = untypedWeights([0.2, 0.7]);
	}, 'mapping.luminanceWeights must contain exactly 3 entries');
	await expectRejectedConfig((config) => {
		config.mapping.distanceWeights = untypedWeights([1, 1, 1, 1]);
	}, 'mapping.distanceWeights must contain exactly 3 entries');
});

test('rejects an unknown mapping mode before processing', async () => {
	await expectRejectedConfig((config) => {
		(config.mapping as { mode: string }).mode = 'quantize';
	}, 'mapping.mode must be one of nearest, luminance, dominant');
});

test('rejects a non-finite output quality', async () => {
	await expectRejectedConfig((config) => {
		config.output.quality = Number.NaN;
	}, 'output.quality must be between zero and one');
});

test('accepts a zero maximum palette size', async () => {
	// The invalid file proves the extraction config passed validation: decoding fails next.
	await expect(
		extractColorsFromFile(new Blob(['x']), { maxColors: 0, alphaThreshold: 128 }, canvasConfig)
	).rejects.toMatchObject({ code: 'notPng' });
});

test('accepts progress milestones that repeat', async () => {
	// "Ordered" means non-decreasing: repeated fractions are legal.
	const config = baseConfig();
	config.processing.progress = {
		...config.processing.progress,
		imageLoaded: 0,
		pixelsRead: 0
	};

	await expect(recolorSprite(invalidFile, [], config)).rejects.toMatchObject({
		code: 'notPng'
	});
});

test('rejects an unknown mapping fallback strategy', async () => {
	await expectRejectedConfig((config) => {
		(config.mapping as { fallback: string }).fallback = 'darkest';
	}, 'mapping.fallback must be one of first-active, unmapped');
});

test('rejects a non-boolean transparency preserve flag', async () => {
	await expectRejectedConfig((config) => {
		(config.transparency as unknown as { preserveAlpha: string }).preserveAlpha = 'yes';
	}, 'transparency.preserveAlpha must be a boolean');
});

test('rejects an unknown output mime type', async () => {
	await expectRejectedConfig((config) => {
		(config.output as { mimeType: string }).mimeType = 'image/gif';
	}, 'output.mimeType must be one of image/png, image/jpeg, image/webp');
});

test('rejects canvas settings that are not the declared shapes', async () => {
	await expectRejectedConfig((config) => {
		(config.canvas as unknown as { willReadFrequently: string }).willReadFrequently = 'yes';
	}, 'canvas.willReadFrequently must be a boolean');
	await expectRejectedConfig((config) => {
		(config.canvas as { colorSpace: string }).colorSpace = 'p3';
	}, 'canvas.colorSpace must be srgb or display-p3');
});

test('rejects processing hooks that are not callable or signal-shaped', async () => {
	await expectRejectedConfig((config) => {
		(config.processing as unknown as { onProgress: string }).onProgress = 'noop';
	}, 'processing.onProgress must be a function');
	await expectRejectedConfig((config) => {
		(config.processing as unknown as { yieldToMain: string }).yieldToMain = 'noop';
	}, 'processing.yieldToMain must be a function');
	await expectRejectedConfig((config) => {
		(config.processing as { signal: object }).signal = { aborted: false };
	}, 'processing.signal must be an AbortSignal');
});

test('rejects excluded pixels that are not whole non-negative indices', async () => {
	await expectRejectedConfig((config) => {
		config.excludedPixels = new Set([-1]);
	}, 'excludedPixels entries must be non-negative integers');
	await expectRejectedConfig((config) => {
		config.excludedPixels = new Set([1.5]);
	}, 'excludedPixels entries must be non-negative integers');
});
