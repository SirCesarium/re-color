import { onDestroy, onMount, untrack } from 'svelte';
import type {
	MappingMode,
	PaletteColor
} from '#core/image-processing/index.ts';
import { OUTPUT_CONFIG, OUTPUT_EXTENSIONS } from '#core/recolor.ts';
import type { MessageKey } from '../../i18n/locales.ts';
import { settings, updateSetting } from '../settings/store.svelte.ts';
import {
	clearWorkspace,
	loadWorkspace,
	type PersistedWorkspace,
	saveWorkspace
} from '../workspace.ts';
import {
	buttonHint as deriveButtonHint,
	exclusionSignature,
	isErrorHint,
	mappingSignature,
	shouldAutoRecolor,
	shouldRecomposeExclusions,
	shouldRunInitialRecolor,
	type WorkflowSnapshot
} from './machine.ts';
import { revokeResultUrls } from './object-urls.ts';
import { createOperationScope } from './operations.ts';
import { watchPaletteColors } from './palette-effects.svelte.ts';
import { createPipeline } from './pipeline.ts';

/** A snapshot where every field is neutral; guards ignore the ones they don't read. */
const IDLE_SNAPSHOT: WorkflowSnapshot = {
	ready: false,
	busy: false,
	noActiveColors: false,
	autoRecolor: false,
	hasResult: false,
	resultMappingSignature: null,
	resultExclusionSignature: null,
	paletteColorsLoaded: false,
	workspaceLoaded: false
};

/** The workflow's observable state, shared with the async pipeline. */
export type WorkflowState = {
	palette: File | null;
	sprite: File | null;
	colors: PaletteColor[];
	mapping: MappingMode;
	/** True once onMount has restored saved settings and seeded `state.mapping`. */
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
	hint: MessageKey | null;
};

/** Sets up the reactive state and lifecycle effects for one recolor page. */
export function createRecolorWorkflow() {
	const state = $state<WorkflowState>({
		palette: null,
		sprite: null,
		colors: [],
		mapping: 'luminance',
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
	const activeColors = $derived(
		state.colors.filter(color => color.active).length
	);
	const noActiveColors = $derived(activeColors === 0);
	const mappingSig = $derived(mappingSignature(state.mapping, state.colors));
	const exclusionSig = $derived(exclusionSignature(state.excludedPixels));
	const buttonHint = $derived.by<MessageKey | null>(() => {
		const result = state.result;

		return deriveButtonHint(
			{
				...IDLE_SNAPSHOT,
				ready,
				busy: state.busy,
				noActiveColors,
				autoRecolor: settings.autoRecolor,
				hasResult: result !== null,
				resultMappingSignature: result?.mappingSignature ?? null
			},
			mappingSig,
			state.hint
		);
	});
	const hintIsError = $derived(isErrorHint(buttonHint));

	// One owner of "what is current": claiming a lane aborts its predecessor,
	// so no async path can start without invalidating the one it replaced.
	const scope = createOperationScope();

	// The async stages share the scope and the URL rules; the store hands them
	// the state plus two live fingerprints read at each stage's own pace.
	const pipeline = createPipeline({
		state,
		scope,
		mappingSignature: () => mappingSig,
		exclusionSignature: () => exclusionSig
	});

	let workspaceSaveTimer: ReturnType<typeof setTimeout> | undefined;
	let workspaceRestoreCancelled = false;

	// ── Restore ──────────────────────────────────────────────────────────
	onMount(() => {
		let disposed = false;

		// The settings store loads preferences at import; seed the live mapping
		// from the saved default and mark restore done so the mapping-sync
		// effect below only starts tracking changes from here on.
		state.mapping = settings.defaultMapping;
		state.settingsLoaded = true;

		void (async () => {
			try {
				if (!settings.persistWorkspace) {
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
					state.colors = workspace.colors.map(color => ({ ...color }));
					state.excludedPixels = workspace.excludedPixels;
				}
			} catch (error) {
				console.error('Could not restore saved app workspace', error);
				state.hint = 'workflow.restoreFailed';
			} finally {
				if (!disposed) state.workspaceLoaded = true;
			}
		})();

		return () => {
			disposed = true;
		};
	});

	// ── Live mapping → saved default ──────────────────────────────────────

	// The home page edits `state.mapping` directly; mirror it into the saved
	// default so the last-used mapping becomes the startup one. Gated on
	// restore so an early flush cannot clobber the saved choice, and the
	// default is read untracked so a settings-page change cannot feed back.
	$effect(() => {
		if (!state.settingsLoaded) return;

		const mapping = state.mapping;

		untrack(() => {
			if (mapping !== settings.defaultMapping) {
				updateSetting('defaultMapping', mapping);
			}
		});
	});

	// ── Workspace persistence ─────────────────────────────────────────────
	$effect(() => {
		if (!state.workspaceLoaded || !settings.persistWorkspace) return;

		const workspace: PersistedWorkspace = {
			palette: state.palette
				? {
						name: state.palette.name,
						blob: state.palette.slice(0, state.palette.size, 'image/png')
					}
				: null,
			sprite: state.sprite
				? {
						name: state.sprite.name,
						blob: state.sprite.slice(0, state.sprite.size, 'image/png')
					}
				: null,
			mapping: state.mapping,
			colors: state.colors.map(({ r, g, b, active }) => ({ r, g, b, active })),
			excludedPixels: [...state.excludedPixels]
		};

		clearTimeout(workspaceSaveTimer);
		workspaceSaveTimer = setTimeout(() => {
			void saveWorkspace(workspace).catch((error: unknown) => {
				console.error('Could not save app workspace', error);
				state.hint = 'workflow.saveDataFailed';
			});
		}, 350);

		return () => clearTimeout(workspaceSaveTimer);
	});

	// ── Result helpers ────────────────────────────────────────────────────
	function clearResult() {
		if (state.result) revokeResultUrls(state.result);

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

	function clearFormData() {
		scope.abortAll();

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

	// ── Actions ───────────────────────────────────────────────────────────
	function handleRecolor() {
		if (state.busy) {
			scope.abortAll();

			state.busy = false;
			state.progress = 0;
			state.hint = null;

			return;
		}

		if (!ready || noActiveColors) return;

		void pipeline.startRecolor();
	}

	function toggleExcludedPixel(index: number) {
		if (!Number.isInteger(index) || index < 0) return;

		state.excludedPixels = state.excludedPixels.includes(index)
			? state.excludedPixels.filter(pixel => pixel !== index)
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

	// ── Reactive effects ──────────────────────────────────────────────────

	// New inputs arrived: any in-flight run is stale and the old result no
	// longer matches, so invalidate it and reset the run-to-idle surface.
	$effect(() => {
		void state.palette;
		void state.sprite;

		untrack(() => {
			scope.abortRun();
			clearResult();
			state.busy = false;
			state.progress = 0;
			state.hint = null;
		});
	});

	// Excluded pixels are indexes into the previous sprite, so a new sprite
	// invalidates them — the fresh one starts with nothing excluded.
	$effect(() => {
		void state.sprite;

		untrack(() => {
			state.excludedPixels = [];
		});
	});

	$effect(() => {
		const signature = mappingSig;
		const result = state.result;
		const autoRecolor = settings.autoRecolor;

		untrack(() => {
			const fires = shouldAutoRecolor(
				{
					...IDLE_SNAPSHOT,
					autoRecolor,
					hasResult: result !== null,
					resultMappingSignature: result?.mappingSignature ?? null
				},
				signature
			);

			if (fires) void pipeline.startRecolor();
		});
	});

	$effect(() => {
		const isReady = ready;
		const hasColors = noActiveColors;
		const paletteReady = state.paletteColorsLoaded;
		const workspaceReady = state.workspaceLoaded;
		const result = state.result;

		untrack(() => {
			const fires = shouldRunInitialRecolor({
				...IDLE_SNAPSHOT,
				ready: isReady,
				noActiveColors: hasColors,
				paletteColorsLoaded: paletteReady,
				workspaceLoaded: workspaceReady,
				hasResult: result !== null,
				busy: state.busy
			});

			if (fires) void pipeline.startRecolor();
		});
	});

	$effect(() => {
		const signature = exclusionSig;
		const result = state.result;

		untrack(() => {
			const fires = shouldRecomposeExclusions(
				{
					...IDLE_SNAPSHOT,
					hasResult: result !== null,
					resultExclusionSignature: result?.exclusionSignature ?? null
				},
				signature
			);

			if (!result || !fires) return;

			const signal = scope.claimComposition();
			void pipeline.updateResultExclusions(result, signal);
		});
	});

	// Re-extract the palette colors when the image or its cap changes; the
	// module owns its own state slice, so it registers its own effect here.
	watchPaletteColors(state);

	// ── Teardown ──────────────────────────────────────────────────────────
	onDestroy(() => {
		scope.abortAll();
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
		get buttonHintIsError() {
			return hintIsError;
		},
		clearFormData,
		handleRecolor,
		toggleExcludedPixel,
		setPixelExclusion,
		downloadResult
	};
}
