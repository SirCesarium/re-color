import { untrack } from 'svelte';
import type { MappingMode, PaletteColor } from '#core/image-processing/index.ts';
import { settings } from '../settings/store.svelte.ts';
import {
	clearWorkspace,
	loadWorkspace,
	type PersistedWorkspace,
	saveWorkspace
} from '../workspace.ts';

/** The slice of workflow state the workspace effects read and write. */
type WorkspaceHost = {
	palette: File | null;
	sprite: File | null;
	colors: PaletteColor[];
	excludedPixels: number[];
	mapping: MappingMode;
	hint: string | null;
	workspaceLoaded: boolean;
};

/**
 * Restores the saved workspace once, then keeps it current with a debounced
 * write. Restore cancels on teardown (its own cleanup) or on an explicit
 * clear (the `isRestoreCancelled` getter); the save never runs before the
 * first restore settles, so an empty initial state cannot clobber a saved
 * session.
 */
export function watchWorkspace(state: WorkspaceHost, isRestoreCancelled: () => boolean): void {
	let saveTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		let disposed = false;

		// Restore happens exactly once: every read below is untracked, so no
		// settings or workspace change can replay it.
		untrack(() => {
			void restoreWorkspace(state, () => disposed, isRestoreCancelled);
		});

		return () => {
			disposed = true;
		};
	});

	$effect(() => {
		if (!state.workspaceLoaded || !settings.persistWorkspace) return;

		const workspace = buildWorkspace(state);

		// Debounce so a burst of palette or exclusion edits costs one save.
		clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			void saveWorkspace(workspace).catch((error: unknown) => {
				console.error('Could not save app workspace', error);
				state.hint = 'workflow.saveDataFailed';
			});
		}, 350);

		return () => clearTimeout(saveTimer);
	});
}

/** Loads the saved workspace into the state, or clears storage when disabled. */
async function restoreWorkspace(
	state: WorkspaceHost,
	isDisposed: () => boolean,
	isCancelled: () => boolean
): Promise<void> {
	try {
		if (!settings.persistWorkspace) {
			await clearWorkspace();
			return;
		}

		const workspace = await loadWorkspace();

		if (isDisposed() || isCancelled()) return;

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
		state.hint = 'workflow.restoreFailed';
	} finally {
		if (!isDisposed()) state.workspaceLoaded = true;
	}
}

/** Snapshots the editable workspace fields for persistence. */
function buildWorkspace(state: WorkspaceHost): PersistedWorkspace {
	return {
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
}
