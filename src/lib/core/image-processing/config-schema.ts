import { z } from 'zod';
import type { PaletteExtractionConfig, RecolorConfig } from './types.ts';

const BYTE_RANGE_MESSAGE = (name: string) =>
	`${name} must be an integer between zero and 255`;
const CHUNK_DURATION_MESSAGE =
	'processing.chunkDurationMs must be greater than zero';
const PROGRESS_MESSAGE =
	'processing.progress values must be ordered fractions between zero and one';
const WEIGHTS_MESSAGE = (name: string, index: number) =>
	`${name}[${index}] must be non-negative`;
const QUALITY_MESSAGE = 'output.quality must be between zero and one';
const MAX_COLORS_MESSAGE = 'maxColors must be a non-negative integer';

/**
 * Runs the schema and, on failure, throws the first issue's message as a
 * `RangeError` so callers get a plain sentence instead of a zod error tree.
 *
 * @throws {RangeError} The message of the first schema issue.
 */
function assertValid(schema: z.ZodType, value: unknown): void {
	const result = schema.safeParse(value);

	if (!result.success) {
		throw new RangeError(
			result.error.issues[0]?.message ?? 'Invalid configuration'
		);
	}
}

/** A whole number from 0 to 255; every failure reuses the same clear message. */
function byteField(name: string) {
	const message = BYTE_RANGE_MESSAGE(name);

	return z
		.number({ error: message })
		.int(message)
		.min(0, message)
		.max(255, message);
}

/** Exactly three finite, non-negative numbers, one per RGB channel. */
function weightsField(name: string) {
	const lengthMessage = `${name} must contain exactly 3 entries`;

	return z.array(z.unknown()).superRefine((weights, ctx) => {
		if (weights.length !== 3) {
			ctx.addIssue({ code: 'custom', message: lengthMessage });

			return;
		}

		for (const [index, weight] of weights.entries()) {
			if (
				typeof weight !== 'number' ||
				!Number.isFinite(weight) ||
				weight < 0
			) {
				ctx.addIssue({ code: 'custom', message: WEIGHTS_MESSAGE(name, index) });
			}
		}
	});
}

const PROGRESS_SCHEMA = z
	.object({
		start: z.number({ error: PROGRESS_MESSAGE }),
		imageLoaded: z.number({ error: PROGRESS_MESSAGE }),
		pixelsRead: z.number({ error: PROGRESS_MESSAGE }),
		processingComplete: z.number({ error: PROGRESS_MESSAGE }),
		complete: z.number({ error: PROGRESS_MESSAGE })
	})
	.superRefine((progress, ctx) => {
		const values = [
			progress.start,
			progress.imageLoaded,
			progress.pixelsRead,
			progress.processingComplete,
			progress.complete
		];

		if (
			values.some(value => value < 0 || value > 1) ||
			values.some((value, index) => index > 0 && value < values[index - 1])
		) {
			ctx.addIssue({ code: 'custom', message: PROGRESS_MESSAGE });
		}
	});

const MAPPING_MODES = ['nearest', 'luminance', 'dominant'] as const;
const MAPPING_MODE_MESSAGE =
	'mapping.mode must be one of nearest, luminance, dominant';

const RECOLOR_CONFIG_SCHEMA = z.object({
	transparency: z.object({
		minAlpha: byteField('transparency.minAlpha'),
		opaqueAlpha: byteField('transparency.opaqueAlpha')
	}),
	processing: z.object({
		chunkDurationMs: z
			.number({ error: CHUNK_DURATION_MESSAGE })
			.refine(value => value > 0, CHUNK_DURATION_MESSAGE),
		progress: PROGRESS_SCHEMA
	}),
	mapping: z.object({
		mode: z.enum(MAPPING_MODES, { error: MAPPING_MODE_MESSAGE }),
		distanceWeights: weightsField('mapping.distanceWeights'),
		luminanceWeights: weightsField('mapping.luminanceWeights')
	}),
	output: z.object({
		quality: z
			.number({ error: QUALITY_MESSAGE })
			.min(0, QUALITY_MESSAGE)
			.max(1, QUALITY_MESSAGE)
			.optional()
	})
});

const PALETTE_EXTRACTION_SCHEMA = z.object({
	maxColors: z
		.number({ error: MAX_COLORS_MESSAGE })
		.int(MAX_COLORS_MESSAGE)
		.min(0, MAX_COLORS_MESSAGE),
	alphaThreshold: byteField('alphaThreshold')
});

/** Fails fast on a bad recolor config, before a single pixel is touched. */
export function validateRecolorConfig(config: RecolorConfig): void {
	assertValid(RECOLOR_CONFIG_SCHEMA, config);
}

/** Same idea for the palette-extraction config. */
export function validateExtractionConfig(
	config: PaletteExtractionConfig
): void {
	assertValid(PALETTE_EXTRACTION_SCHEMA, config);
}
