/**
 * Hands the browser a chance to paint and run other work between processing
 * chunks, so a long recolor never freezes the tab.
 *
 * Uses the Scheduler API where it exists, a zero-delay timer everywhere else.
 *
 * @returns Resolves once the browser has had its turn.
 */
export function yieldToBrowser(): Promise<void> {
	const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;

	if (scheduler?.yield) return scheduler.yield();

	return new Promise((resolve) => setTimeout(resolve, 0));
}
