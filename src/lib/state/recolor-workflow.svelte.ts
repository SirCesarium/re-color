import { onDestroy, onMount, untrack } from 'svelte';
import {
	APP_SETTINGS_KEY,
	DEFAULT_APP_SETTINGS,
	clearWorkspace,
	isMappingMode,
	loadWorkspace,
	parseAppSettings,
	saveWorkspace
} from './app-settings.ts';
import type { AppSettings, PersistedWorkspace } from './app-settings.ts';
import {
	composeExcludedPixels,
	extractColorsFromFile,
	recolorSprite
} from '../image-processing/index.ts';
import type { MappingMode, PaletteColor, RecolorConfig } from '../image-processing/types.ts';
import {
	CANVAS_CONFIG,
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
	settings: AppSettings;
	settingsLoaded: boolean;
	workspaceLoaded: boolean;
	paletteColorsLoaded: boolean;
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
};

/** Creates isolated reactive state and lifecycle effects for one recolor page. */
export function createRecolorWorkflow() {
	const state = $state<WorkflowState>({
		palette: null,
		sprite: null,
		colors: [],
		mapping: 'luminance',
		settings: { ...DEFAULT_APP_SETTINGS },
		settingsLoaded: false,
		workspaceLoaded: false,
		paletteColorsLoaded: false,
		result: null,
		excludedPixels: [],
		busy: false,
		progress: 0,
		hint: null
	});

	const ready = $derived(state.palette !== null && state.sprite !== null);
	const activeColors = $derived(state.colors.filter((color) => color.active).length);
	const noActiveColors = $derived(activeColors === 0);
	const mappingSig = $derived(
		`${state.mapping}:${state.colors.map((color) => `${color.r},${color.g},${color.b},${color.active ? 1 : 0}`).join(';')}`
	);
	const exclusionSig = $derived([...state.excludedPixels].sort((a, b) => a - b).join(','));
	const buttonHint = $derived.by(() => {
		if (ready && noActiveColors) return 'Select at least 1 color';
		if (
			ready &&
			state.result &&
			!state.busy &&
			state.result.mappingSignature !== mappingSig &&
			!state.settings.autoRecolor
		) {
			return 'Press recolor to apply the new changes.';
		}
		return state.hint;
	});

	let runId = 0;
	let compositionId = 0;
	let workspaceSaveTimer: ReturnType<typeof setTimeout> | undefined;
	let workspaceRestoreCancelled = false;

	onMount(() => {
		let disposed = false;

		try {
			const storedSettings = localStorage.getItem(APP_SETTINGS_KEY);
			state.settings = parseAppSettings(storedSettings);
			if (!storedSettings) {
				const legacyMapping = localStorage.getItem(MAPPING_STORAGE_KEY);
				if (isMappingMode(legacyMapping)) {
					state.settings.defaultMapping = legacyMapping;
					state.mapping = legacyMapping;
				}
			}
		} catch (error) {
			console.error('Could not read saved app settings', error);
		}
		state.mapping = state.settings.defaultMapping;
		state.settingsLoaded = true;

		void (async () => {
			try {
				if (!state.settings.persistWorkspace) {
					await clearWorkspace();
					return;
				}

				const workspace = await loadWorkspace();
				if (disposed || workspaceRestoreCancelled) return;

				if (workspace) {
					state.palette = workspace.palette
						? new File([workspace.palette.blob], workspace.palette.name, {
								type: 'image/png'
							})
						: null;
					state.sprite = workspace.sprite
						? new File([workspace.sprite.blob], workspace.sprite.name, {
								type: 'image/png'
							})
						: null;
					state.colors = workspace.colors.map((color) => ({ ...color }));
					state.excludedPixels = workspace.excludedPixels;
				}
			} catch (error) {
				console.error('Could not restore saved app workspace', error);
				state.hint = 'Could not restore saved app data';
			} finally {
				if (!disposed) state.workspaceLoaded = true;
			}
		})();

		return () => {
			disposed = true;
		};
	});

	$effect(() => {
		if (!state.settingsLoaded) return;

		state.settings.defaultMapping = state.mapping;

		try {
			localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(state.settings));
		} catch (error) {
			console.error('Could not save app settings', error);
			state.hint = 'Could not save app settings';
		}
	});

	$effect(() => {
		if (!state.settingsLoaded || typeof document === 'undefined') return;

		document.documentElement.classList.toggle(
			'animations-disabled',
			!state.settings.animationsEnabled
		);
	});

	$effect(() => {
		if (!state.workspaceLoaded || !state.settings.persistWorkspace) return;

		const workspace: PersistedWorkspace = {
			palette: state.palette
				? { name: state.palette.name, blob: state.palette.slice(0, state.palette.size, 'image/png') }
				: null,
			sprite: state.sprite
				? { name: state.sprite.name, blob: state.sprite.slice(0, state.sprite.size, 'image/png') }
				: null,
			mapping: state.mapping,
			colors: state.colors.map(({ r, g, b, active }) => ({ r, g, b, active })),
			excludedPixels: [...state.excludedPixels]
		};

		clearTimeout(workspaceSaveTimer);
		workspaceSaveTimer = setTimeout(() => {
			void saveWorkspace(workspace).catch((error: unknown) => {
				console.error('Could not save app workspace', error);
				state.hint = 'Could not save app data';
			});
		}, 350);

		return () => clearTimeout(workspaceSaveTimer);
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

	function clearFormData() {
		runId++;
		compositionId++;
		workspaceRestoreCancelled = true;
		clearResult();
		state.palette = null;
		state.sprite = null;
		state.colors = [];
		state.excludedPixels = [];
		state.busy = false;
		state.progress = 0;
		state.hint = null;
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
		if (state.busy) {
			runId++;
			compositionId++;
			state.busy = false;
			state.progress = 0;
			state.hint = null;

			return;
		}

		if (!ready || noActiveColors) return;

		void startRecolor();
	}

	function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
		state.settings[key] = value;

		if (key === 'defaultMapping') state.mapping = state.settings.defaultMapping;
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
				() => id !== compositionId || state.result?.previewUrl !== result.previewUrl
			);

			if (!composition || id !== compositionId) return;

			const currentResult = state.result;
			if (!currentResult || currentResult.previewUrl !== result.previewUrl) {
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
		const result = state.result;
		const autoRecolor = state.settings.autoRecolor;

		untrack(() => {
			if (
				signature &&
				result &&
				result.mappingSignature !== signature &&
				autoRecolor
			) {
				void startRecolor();
			}
		});
	});

	$effect(() => {
		const canRunInitial = ready && state.paletteColorsLoaded && state.workspaceLoaded;
		const hasResult = state.result !== null;

		untrack(() => {
			if (canRunInitial && !hasResult && !state.busy && !noActiveColors) {
				void startRecolor();
			}
		});
	});

	$effect(() => {
		const signature = exclusionSig;
		const result = state.result;

		untrack(() => {
			if (!result || result.exclusionSignature === signature) {
				return;
			}

			const id = ++compositionId;
			void updateResultExclusions(result, id);
		});
	});

	$effect(() => {
		const file = state.palette;
		const maxColors = state.settings.maxPaletteColors;

		if (!file) {
			state.colors = [];
			state.paletteColorsLoaded = false;

			return;
		}

		let cancelled = false;
		state.paletteColorsLoaded = false;
		const previousColors = untrack(() => state.colors);
		void extractColorsFromFile(
			file,
			{ ...PALETTE_CONFIG, maxColors },
			CANVAS_CONFIG
		)
			.then((colors) => {
				if (cancelled) return;

				state.colors = colors.map((color) => {
					const previous = previousColors?.find(
						(candidate) =>
							candidate.r === color.r && candidate.g === color.g && candidate.b === color.b
					);
					return previous ? { ...color, active: previous.active } : color;
				});
				state.paletteColorsLoaded = true;
			})
			.catch((error: unknown) => {
				if (cancelled) return;

				console.error('Could not extract the palette image colors', error);
				state.colors = [];
				state.paletteColorsLoaded = false;
				state.hint = 'Could not read palette image';
			});

		return () => {
			cancelled = true;
		};
	});

	onDestroy(() => {
		runId++;
		clearTimeout(workspaceSaveTimer);
		clearResult();
		if (typeof document !== 'undefined') {
			document.documentElement.classList.remove('animations-disabled');
		}
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
		setSetting,
		clearFormData,
		handleRecolor,
		toggleExcludedPixel,
		setPixelExclusion,
		downloadResult
	};
}
