/**
 * Yields control to the browser between processing chunks.
 *
 * Uses the Scheduler API when available and a zero-delay timer otherwise.
 *
 * @returns A promise resolved after the browser has had an opportunity to run other work.
 */
export function yieldToBrowser(): Promise<void> {
	const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;

	if (scheduler?.yield) return scheduler.yield();

	return new Promise((resolve) => setTimeout(resolve, 0));
}
