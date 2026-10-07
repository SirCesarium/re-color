import { onDestroy, onMount, untrack } from 'svelte';
import { extractColors, recolorSprite } from '../image-processing/index.ts';
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
	result: { url: string } | null;
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
		`${state.mapping}:${state.colors.map((color) => (color.active ? '1' : '0')).join('')}:${state.excludedPixels.join(',')}`
	);
	const buttonHint = $derived(
		ready && noActiveColors ? 'Select at least 1 color' : state.hint
	);

	let runId = 0;

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
		if (state.result) URL.revokeObjectURL(state.result.url);

		state.result = null;
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

		state.busy = true;
		state.progress = 0;
		state.hint = null;

		try {
			const config: RecolorConfig = {
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
				excludedPixels: new Set(state.excludedPixels),
				output: OUTPUT_CONFIG
			};

			const url = await recolorSprite(file, state.colors, config);

			if (id !== runId || url === null) return;

			clearResult();
			state.result = { url };
		} catch (error) {
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
		downloadResult
	};
}
