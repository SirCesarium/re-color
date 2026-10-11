import { z } from 'zod';
import type { PaletteExtractionConfig, RecolorConfig } from './types.ts';

const BYTE_RANGE_MESSAGE = (name: string) =>
	`${name} must be an integer between zero and 255`;
const CHUNK_DURATION_MESSAGE = 'processing.chunkDurationMs must be greater than zero';
const PROGRESS_MESSAGE = 'processing.progress values must be ordered fractions between zero and one';
const WEIGHTS_MESSAGE = (name: string, index: number) =>
	`${name}[${index}] must be non-negative`;
const QUALITY_MESSAGE = 'output.quality must be between zero and one';
const MAX_COLORS_MESSAGE = 'maxColors must be a non-negative integer';

/**
 * Parses `value` with `schema` and reports the first problem as a `RangeError`.
 *
 * @throws {RangeError} The message of the first schema issue.
 */
function assertValid(schema: z.ZodType, value: unknown): void {
	const result = schema.safeParse(value);

	if (!result.success) {
		throw new RangeError(result.error.issues[0]?.message ?? 'Invalid configuration');
	}
}

/** Integer byte field constrained to the 0-255 range. */
function byteField(name: string) {
	const message = BYTE_RANGE_MESSAGE(name);

	return z.number({ error: message }).int(message).min(0, message).max(255, message);
}

/** Channel weights: every entry must be a finite, non-negative number. */
function weightsField(name: string) {
	return z
		.array(z.unknown())
		.superRefine((weights, ctx) => {
			for (const [index, weight] of weights.entries()) {
				if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0) {
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
			values.some((value) => value < 0 || value > 1) ||
			values.some((value, index) => index > 0 && value < values[index - 1])
		) {
			ctx.addIssue({ code: 'custom', message: PROGRESS_MESSAGE });
		}
	});

const RECOLOR_CONFIG_SCHEMA = z.object({
	transparency: z.object({
		minAlpha: byteField('transparency.minAlpha'),
		opaqueAlpha: byteField('transparency.opaqueAlpha')
	}),
	processing: z.object({
		chunkDurationMs: z
			.number({ error: CHUNK_DURATION_MESSAGE })
			.refine((value) => value > 0, CHUNK_DURATION_MESSAGE),
		progress: PROGRESS_SCHEMA
	}),
	mapping: z.object({
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

/** Rejects invalid recolor runtime values before image processing begins. */
export function validateRecolorConfig(config: RecolorConfig): void {
	assertValid(RECOLOR_CONFIG_SCHEMA, config);
}

/** Rejects invalid palette extraction values before image processing begins. */
export function validateExtractionConfig(config: PaletteExtractionConfig): void {
	assertValid(PALETTE_EXTRACTION_SCHEMA, config);
}
