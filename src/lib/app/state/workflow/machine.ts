import type {
	MappingMode,
	PaletteColor
} from '#core/image-processing/index.ts';
import type { MessageKey } from '../../i18n/locales.ts';

/**
 * The recolor workflow's decision logic, extracted from the reactive closure so
 * it can be unit-tested without a DOM. Each function answers one question about
 * a snapshot of the workflow's observable state — what hint to show, and what
 * should trigger a recolor or a recomposition. The Svelte effects become thin:
 * build a snapshot, ask the machine, act on the answer.
 */

/** Everything the decision functions need to observe about the workflow. */
export type WorkflowSnapshot = {
	ready: boolean;
	busy: boolean;
	noActiveColors: boolean;
	autoRecolor: boolean;
	hasResult: boolean;
	resultMappingSignature: string | null;
	resultExclusionSignature: string | null;
	paletteColorsLoaded: boolean;
	workspaceLoaded: boolean;
};

/** Hints that report a failure: they show even with help hints turned off. */
const ERROR_HINT_KEYS = new Set<MessageKey>([
	'workflow.restoreFailed',
	'workflow.saveSettingsFailed',
	'workflow.saveDataFailed',
	'workflow.recolorFailed',
	'workflow.exclusionFailed',
	'workflow.paletteFailed'
]);

/** A stable fingerprint of the mapping mode and the current palette colors. */
export function mappingSignature(
	mapping: MappingMode,
	colors: readonly PaletteColor[]
): string {
	const fingerprint = colors
		.map(color => `${color.r},${color.g},${color.b},${color.active ? 1 : 0}`)
		.join(';');

	return `${mapping}:${fingerprint}`;
}

/** A fingerprint of the excluded pixels, independent of their order. */
export function exclusionSignature(excludedPixels: readonly number[]): string {
	return [...excludedPixels].sort((a, b) => a - b).join(',');
}

export function isErrorHint(hint: MessageKey | null): boolean {
	return hint !== null && ERROR_HINT_KEYS.has(hint);
}

/** The hint to show on the recolor button given the current state. */
export function buttonHint(
	snapshot: WorkflowSnapshot,
	currentMappingSignature: string,
	currentHint: MessageKey | null
): MessageKey | null {
	if (snapshot.ready && snapshot.noActiveColors) return 'workflow.noColors';

	const changesPending =
		snapshot.ready &&
		snapshot.hasResult &&
		!snapshot.busy &&
		snapshot.resultMappingSignature !== currentMappingSignature &&
		!snapshot.autoRecolor;

	if (changesPending) return 'workflow.applyChanges';

	return currentHint;
}

/** Whether a mapping change should kick off an automatic recolor. */
export function shouldAutoRecolor(
	snapshot: WorkflowSnapshot,
	currentMappingSignature: string
): boolean {
	return Boolean(
		currentMappingSignature &&
			snapshot.hasResult &&
			snapshot.resultMappingSignature !== currentMappingSignature &&
			snapshot.autoRecolor
	);
}

/** Whether the first recolor should run once every input is ready. */
export function shouldRunInitialRecolor(snapshot: WorkflowSnapshot): boolean {
	const inputsReady =
		snapshot.ready && snapshot.paletteColorsLoaded && snapshot.workspaceLoaded;

	return Boolean(
		inputsReady &&
			!snapshot.hasResult &&
			!snapshot.busy &&
			!snapshot.noActiveColors
	);
}

/** Whether the excluded pixels changed enough to warrant a recomposition. */
export function shouldRecomposeExclusions(
	snapshot: WorkflowSnapshot,
	currentExclusionSignature: string
): boolean {
	return Boolean(
		snapshot.hasResult &&
			snapshot.resultExclusionSignature !== currentExclusionSignature
	);
}
