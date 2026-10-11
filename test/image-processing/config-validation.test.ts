import { expect, test } from 'bun:test';
import {
	CANVAS_CONFIG,
	MAPPING_CONFIG,
	OUTPUT_CONFIG,
	PROCESSING_CONFIG,
	TRANSPARENCY_CONFIG
} from '../../src/lib/config/recolor.ts';
import { recolorSprite } from '../../src/lib/image-processing/engine.ts';
import { extractColorsFromFile } from '../../src/lib/image-processing/palette.ts';
import type { RecolorConfig } from '../../src/lib/image-processing/types.ts';

const invalidFile = new File(['x'], 'sprite.png', { type: 'image/png' });
const canvasConfig = { willReadFrequently: true, colorSpace: 'srgb' as const };

function baseConfig(): RecolorConfig {
	return {
		canvas: CANVAS_CONFIG,
		mapping: { ...MAPPING_CONFIG },
		transparency: { ...TRANSPARENCY_CONFIG },
		processing: {
			...PROCESSING_CONFIG,
			onProgress: () => {},
			isCancelled: () => false
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
	await expectRejectedConfig(
		(config) => {
			config.transparency.minAlpha = 300;
		},
		'transparency.minAlpha must be an integer between zero and 255'
	);
	await expectRejectedConfig(
		(config) => {
			config.transparency.opaqueAlpha = -1;
		},
		'transparency.opaqueAlpha must be an integer between zero and 255'
	);
	await expectRejectedConfig(
		(config) => {
			config.transparency.opaqueAlpha = 12.5;
		},
		'transparency.opaqueAlpha must be an integer between zero and 255'
	);
});

test('rejects a chunk duration that is not a positive finite number', async () => {
	await expectRejectedConfig(
		(config) => {
			config.processing.chunkDurationMs = 0;
		},
		'processing.chunkDurationMs must be greater than zero'
	);
	await expectRejectedConfig(
		(config) => {
			config.processing.chunkDurationMs = Number.POSITIVE_INFINITY;
		},
		'processing.chunkDurationMs must be greater than zero'
	);
});

test('rejects progress milestones that are out of range or unordered', async () => {
	await expectRejectedConfig(
		(config) => {
			config.processing.progress = { ...config.processing.progress, complete: 2 };
		},
		'processing.progress values must be ordered fractions between zero and one'
	);
	await expectRejectedConfig(
		(config) => {
			config.processing.progress = { ...config.processing.progress, start: 0.9, complete: 0.1 };
		},
		'processing.progress values must be ordered fractions between zero and one'
	);
	await expectRejectedConfig(
		(config) => {
			config.processing.progress = { ...config.processing.progress, pixelsRead: Number.NaN };
		},
		'processing.progress values must be ordered fractions between zero and one'
	);
});

test('rejects negative or non-finite mapping weights', async () => {
	await expectRejectedConfig(
		(config) => {
			config.mapping.distanceWeights = [2, -1, 3];
		},
		'mapping.distanceWeights[1] must be non-negative'
	);
	await expectRejectedConfig(
		(config) => {
			config.mapping.luminanceWeights = [Number.NaN, 0.7152, 0.0722];
		},
		'mapping.luminanceWeights[0] must be non-negative'
	);
});

test('rejects an output quality outside zero and one', async () => {
	await expectRejectedConfig(
		(config) => {
			config.output.quality = 1.5;
		},
		'output.quality must be between zero and one'
	);
});

test('accepts the default processing configuration', async () => {
	// The invalid file proves the config passed validation: decoding fails next.
	await expect(recolorSprite(invalidFile, [], baseConfig())).rejects.toThrow('validation.notPng');
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
