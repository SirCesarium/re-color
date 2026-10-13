/**
 * The workflow's cancellation lanes, built on `AbortController`.
 *
 * Async work that can be superseded comes in exactly two kinds — a recolor run
 * and an exclusion composition — and each kind has one current holder. Claiming
 * a lane hands out the new holder's signal *and* aborts the previous one, so a
 * caller cannot start work without invalidating its predecessor: the old
 * "remember to bump the counter" rule becomes structurally impossible to
 * forget. Every stale check downstream collapses to `signal.aborted`.
 */
export type OperationScope = {
	/** Aborts the previous run (if any) and returns the signal for the new one. */
	claimRun(): AbortSignal;
	/** Aborts the previous composition (if any) and returns the new signal. */
	claimComposition(): AbortSignal;
	/** Invalidates the in-flight run without starting a new one. */
	abortRun(): void;
	/** Invalidates the in-flight composition without starting a new one. */
	abortComposition(): void;
	/** Cancels both lanes at once — used when the whole flow is torn down. */
	abortAll(): void;
};

/** Creates a fresh pair of independent lanes; no controller until first claim. */
export function createOperationScope(): OperationScope {
	let run: AbortController | null = null;
	let composition: AbortController | null = null;

	function claim(current: AbortController | null): AbortController {
		current?.abort();

		return new AbortController();
	}

	function claimRun(): AbortSignal {
		run = claim(run);

		return run.signal;
	}

	function claimComposition(): AbortSignal {
		composition = claim(composition);

		return composition.signal;
	}

	function abortAll(): void {
		run?.abort();
		composition?.abort();
	}

	return {
		claimRun,
		claimComposition,
		abortRun: () => run?.abort(),
		abortComposition: () => composition?.abort(),
		abortAll
	};
}
