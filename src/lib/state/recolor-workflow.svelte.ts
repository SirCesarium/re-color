import { onDestroy, onMount, untrack } from 'svelte';
import { composeExcludedPixels, extractColors, recolorSprite } from '../image-processing/index.ts';
import type { MappingMode, PaletteColor, RecolorConfig } from '../image-processing/types.ts';
import {
	CANVAS_CONFIG,
	MAPPING_OPTIONS,
	MAPPING_CONFIG,
	MAPPING_STORAGE_KEY,
	OUTPUT_CONFIG,
	OUTPUT_EXTENSIONS,
	PALETTE_CONFIG,
	PROCESSING_CONFIG,
	TRANSPARENCY_CONFIG
} from '../config/recolor.ts';

type WorkflowState = {
	palette: File | null;
	sprite: File | null;
	colors: PaletteColor[];
	mapping: MappingMode;
	result: {
		url: string;
		previewUrl: string;
		mappingSignature: string;
		exclusionSignature: string;
	} | null;
	excludedPixels: number[];
	busy: boolean;
	progress: number;
	hint: string | null;
	mappingLoaded: boolean;
};

/** Creates isolated reactive state and lifecycle effects for one recolor page. */
export function createRecolorWorkflow() {
	const state = $state<WorkflowState>({
		palette: null,
		sprite: null,
		colors: [],
		mapping: 'luminance',
		result: null,
		excludedPixels: [],
		busy: false,
		progress: 0,
		hint: null,
		mappingLoaded: false
	});

	const ready = $derived(state.palette !== null && state.sprite !== null);
	const activeColors = $derived(state.colors.filter((color) => color.active).length);
	const noActiveColors = $derived(activeColors === 0);
	const mappingSig = $derived(
		`${state.mapping}:${state.colors.map((color) => `${color.r},${color.g},${color.b},${color.active ? 1 : 0}`).join(';')}`
	);
	const exclusionSig = $derived([...state.excludedPixels].sort((a, b) => a - b).join(','));
	const buttonHint = $derived(
		ready && noActiveColors ? 'Select at least 1 color' : state.hint
	);

	let runId = 0;
	let compositionId = 0;

	onMount(() => {
		const stored = localStorage.getItem(MAPPING_STORAGE_KEY);
		const option = MAPPING_OPTIONS.find((candidate) => candidate.value === stored);

		if (option) state.mapping = option.value;

		state.mappingLoaded = true;
	});

	$effect(() => {
		if (!state.mappingLoaded) return;

		localStorage.setItem(MAPPING_STORAGE_KEY, state.mapping);
	});

	function clearResult() {
		if (state.result) {
			for (const url of new Set([state.result.url, state.result.previewUrl])) {
				URL.revokeObjectURL(url);
			}
		}

		state.result = null;
	}

	function createConfig(id: number): RecolorConfig {
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
					if (id === runId) state.progress = fraction;
				},
				isCancelled: () => id !== runId
			},
			output: OUTPUT_CONFIG
		};
	}

	function releaseResult(url: string | null, retainedUrls: ReadonlySet<string> = new Set()) {
		if (url && !retainedUrls.has(url)) URL.revokeObjectURL(url);
	}

	async function composeForCurrentExclusions(
		previewUrl: string,
		file: File,
		isStale: () => boolean
	): Promise<{ url: string; exclusionSignature: string } | null> {
		while (!isStale()) {
			const signature = exclusionSig;
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
				releaseResult(url, new Set([previewUrl]));
				return null;
			}

			if (signature === exclusionSig) return { url, exclusionSignature: signature };

			releaseResult(url, new Set([previewUrl]));
		}

		return null;
	}

	function downloadResult() {
		if (!state.result || !state.sprite) return;

		const name = state.sprite.name.replace(/\.[^.]+$/, '') || 'sprite';
		const link = document.createElement('a');

		link.href = state.result.url;
		link.download = `${name}-recolored.${OUTPUT_EXTENSIONS[OUTPUT_CONFIG.mimeType]}`;
		link.click();
	}

	async function startRecolor() {
		const file = state.sprite;

		if (!file) return;

		const id = ++runId;
		compositionId++;
		const signature = mappingSig;
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
				previewUrl = await recolorSprite(file, state.colors, createConfig(id));

				if (id !== runId || previewUrl === null) {
					releaseResult(previewUrl);
					return;
				}

				createdPreviewUrl = previewUrl;
			}

			const composition = await composeForCurrentExclusions(
				previewUrl,
				file,
				() => id !== runId
			);

			if (!composition) {
				releaseResult(createdPreviewUrl);
				return;
			}

			const { url, exclusionSignature } = composition;
			createdResultUrl = url === previewUrl ? null : url;
			const nextResult = {
				url,
				previewUrl,
				mappingSignature: signature,
				exclusionSignature
			};
			const retainedUrls = new Set([nextResult.url, nextResult.previewUrl]);

			if (previous) {
				for (const oldUrl of new Set([previous.url, previous.previewUrl])) {
					releaseResult(oldUrl, retainedUrls);
				}
			}

			state.result = nextResult;
		} catch (error) {
			releaseResult(createdPreviewUrl);
			releaseResult(createdResultUrl);
			console.error(error);

			if (id === runId) state.hint = 'Recolor failed';
		} finally {
			if (id === runId) {
				state.busy = false;
				state.progress = 0;
			}
		}
	}

	function handleRecolor() {
		if (!ready || noActiveColors || state.busy) return;

		void startRecolor();
	}

	function toggleExcludedPixel(index: number) {
		if (!Number.isInteger(index) || index < 0) return;

		state.excludedPixels = state.excludedPixels.includes(index)
			? state.excludedPixels.filter((pixel) => pixel !== index)
			: [...state.excludedPixels, index];
	}

	function setPixelExclusion(indexes: readonly number[], excluded: boolean) {
		const next = new Set(state.excludedPixels);

		for (const index of indexes) {
			if (!Number.isInteger(index) || index < 0) continue;

			if (excluded) next.add(index);
			else next.delete(index);
		}

		state.excludedPixels = [...next];
	}

	async function updateResultExclusions(
		result: NonNullable<WorkflowState['result']>,
		id: number
	) {
		const file = state.sprite;
		if (!file) return;

		try {
			const composition = await composeForCurrentExclusions(
				result.previewUrl,
				file,
				() =>
					id !== compositionId ||
					state.result?.previewUrl !== result.previewUrl ||
					state.result.mappingSignature !== mappingSig
			);

			if (!composition || id !== compositionId) return;

			const currentResult = state.result;
			if (
				!currentResult ||
				currentResult.previewUrl !== result.previewUrl ||
				currentResult.mappingSignature !== mappingSig
			) {
				releaseResult(composition.url, new Set([result.previewUrl]));
				return;
			}

			const updatedResult = {
				...currentResult,
				url: composition.url,
				exclusionSignature: composition.exclusionSignature
			};

			state.result = updatedResult;
			releaseResult(
				currentResult.url,
				new Set([updatedResult.url, updatedResult.previewUrl])
			);
		} catch (error) {
			console.error(error);

			if (id === compositionId) state.hint = 'Could not update excluded pixels';
		}
	}

	$effect(() => {
		void state.palette;
		void state.sprite;

		untrack(() => {
			runId++;
			clearResult();
			state.busy = false;
			state.progress = 0;
			state.hint = null;
		});
	});

	$effect(() => {
		void state.sprite;

		untrack(() => {
			state.excludedPixels = [];
		});
	});

	$effect(() => {
		const signature = mappingSig;

		untrack(() => {
			if (signature && state.result !== null) void startRecolor();
		});
	});

	$effect(() => {
		const signature = exclusionSig;
		const result = state.result;
		const mapping = mappingSig;

		untrack(() => {
			if (
				!result ||
				result.mappingSignature !== mapping ||
				result.exclusionSignature === signature
			) {
				return;
			}

			const id = ++compositionId;
			void updateResultExclusions(result, id);
		});
	});

	$effect(() => {
		const file = state.palette;

		if (!file) {
			state.colors = [];

			return;
		}

		let cancelled = false;
		const url = URL.createObjectURL(file);
		const image = new Image();

		image.onload = () => {
			if (!cancelled) {
				state.colors = extractColors(image, PALETTE_CONFIG, CANVAS_CONFIG);
			}
		};

		image.src = url;

		return () => {
			cancelled = true;
			URL.revokeObjectURL(url);
		};
	});

	onDestroy(() => {
		runId++;
		clearResult();
	});

	return {
		state,
		get ready() {
			return ready;
		},
		get noActiveColors() {
			return noActiveColors;
		},
		get buttonHint() {
			return buttonHint;
		},
		handleRecolor,
		toggleExcludedPixel,
		setPixelExclusion,
		downloadResult
	};
}
