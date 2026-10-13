import {
	composeExcludedPixels,
	type RecolorConfig,
	recolorSprite
} from '#core/image-processing/index.ts';
import {
	CANVAS_CONFIG,
	MAPPING_CONFIG,
	OUTPUT_CONFIG,
	PROCESSING_CONFIG,
	TRANSPARENCY_CONFIG
} from '#core/recolor.ts';
import { releaseUrl } from './object-urls.ts';
import type { OperationScope } from './operations.ts';
import type { WorkflowState } from './store.svelte.ts';

/** What the async stages need from the store that owns them. */
export type PipelineHost = {
	/** Live workflow state; every mutation lands on the reactive store. */
	state: WorkflowState;
	/** The cancellation lanes a run or composition claims while it works. */
	scope: OperationScope;
	/** Current mapping fingerprint, re-read when each run starts. */
	mappingSignature(): string;
	/** Current exclusion fingerprint, re-read on every compose turn. */
	exclusionSignature(): string;
};

type Result = NonNullable<WorkflowState['result']>;

/**
 * The workflow's async stages: recolor the sprite, then compose the excluded
 * pixels back over it. They live together because they share the scope (both
 * lanes) and the URL release rules; the store keeps the effects and the actions
 * that drive them.
 */
export function createPipeline(host: PipelineHost) {
	const { state, scope } = host;

	function createConfig(signal: AbortSignal): RecolorConfig {
		return {
			canvas: CANVAS_CONFIG,
			mapping: {
				...MAPPING_CONFIG,
				mode: state.mapping
			},
			transparency: TRANSPARENCY_CONFIG,
			processing: {
				...PROCESSING_CONFIG,
				onProgress: (fraction: number) => {
					if (!signal.aborted) state.progress = fraction;
				},
				signal
			},
			output: OUTPUT_CONFIG
		};
	}

	/** Composes until the exclusions stop moving; `null` when superseded. */
	async function composeForCurrentExclusions(
		previewUrl: string,
		file: File,
		isStale: () => boolean
	): Promise<{ url: string; exclusionSignature: string } | null> {
		while (!isStale()) {
			const signature = host.exclusionSignature();
			const pixels = [...state.excludedPixels];
			let url = previewUrl;

			if (pixels.length > 0) {
				url = await composeExcludedPixels(
					previewUrl,
					file,
					new Set(pixels),
					CANVAS_CONFIG,
					OUTPUT_CONFIG
				);
			}

			if (isStale()) {
				releaseUrl(url, new Set([previewUrl]));
				return null;
			}

			if (signature === host.exclusionSignature()) {
				return { url, exclusionSignature: signature };
			}

			releaseUrl(url, new Set([previewUrl]));
		}

		return null;
	}

	/** Swaps in a fresh result, releasing the URLs the previous one owned. */
	function publishResult(next: Result, previous: Result | null): void {
		const retainedUrls = new Set([next.url, next.previewUrl]);

		if (previous) {
			for (const oldUrl of new Set([previous.url, previous.previewUrl])) {
				releaseUrl(oldUrl, retainedUrls);
			}
		}

		state.result = next;
	}

	async function startRecolor(): Promise<void> {
		const file = state.sprite;

		if (!file) return;

		const signal = scope.claimRun();

		scope.abortComposition();

		const signature = host.mappingSignature();
		const previous = state.result;

		let previewUrl =
			previous?.mappingSignature === signature ? previous.previewUrl : null;
		let createdPreviewUrl: string | null = null;
		let createdResultUrl: string | null = null;

		state.busy = true;
		state.progress = 0;
		state.hint = null;

		try {
			if (!previewUrl) {
				previewUrl = await recolorSprite(
					file,
					state.colors,
					createConfig(signal)
				);

				if (signal.aborted || previewUrl === null) {
					releaseUrl(previewUrl);
					return;
				}

				createdPreviewUrl = previewUrl;
			}

			const composition = await composeForCurrentExclusions(
				previewUrl,
				file,
				() => signal.aborted
			);

			if (!composition) {
				releaseUrl(createdPreviewUrl);
				return;
			}

			const { url, exclusionSignature } = composition;
			createdResultUrl = url === previewUrl ? null : url;

			publishResult(
				{
					url,
					previewUrl,
					mappingSignature: signature,
					exclusionSignature
				},
				previous
			);
		} catch (error) {
			releaseUrl(createdPreviewUrl);
			releaseUrl(createdResultUrl);
			console.error(error);

			if (!signal.aborted) state.hint = 'workflow.recolorFailed';
		} finally {
			if (!signal.aborted) {
				state.busy = false;
				state.progress = 0;
			}
		}
	}

	async function updateResultExclusions(
		result: Result,
		signal: AbortSignal
	): Promise<void> {
		const file = state.sprite;
		if (!file) return;

		try {
			const composition = await composeForCurrentExclusions(
				result.previewUrl,
				file,
				() => signal.aborted || state.result?.previewUrl !== result.previewUrl
			);

			if (!composition || signal.aborted) return;

			const currentResult = state.result;

			if (!currentResult || currentResult.previewUrl !== result.previewUrl) {
				releaseUrl(composition.url, new Set([result.previewUrl]));
				return;
			}

			publishResult(
				{
					...currentResult,
					url: composition.url,
					exclusionSignature: composition.exclusionSignature
				},
				currentResult
			);
		} catch (error) {
			console.error(error);

			if (!signal.aborted) state.hint = 'workflow.exclusionFailed';
		}
	}

	return { startRecolor, updateResultExclusions };
}
