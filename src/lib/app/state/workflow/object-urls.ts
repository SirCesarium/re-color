/**
 * Object-URL release helpers for the workflow's results.
 *
 * A result owns two addresses — the final `url` and the `previewUrl` every
 * composition reads back — and both must be revoked exactly once, except while
 * something still references them. Keeping the rules here (pure, bun-tested)
 * keeps the store from hand-rolling a new retain set each time.
 */

/**
 * Revokes an object URL unless a retained set still references it.
 *
 * @param url The address to release; `null` is a no-op.
 * @param retainedUrls Addresses that must survive — the current result's.
 */
export function releaseUrl(
	url: string | null,
	retainedUrls: ReadonlySet<string> = new Set()
): void {
	if (url && !retainedUrls.has(url)) URL.revokeObjectURL(url);
}

/** Revokes both addresses of a result, each exactly once even when equal. */
export function revokeResultUrls(result: {
	url: string;
	previewUrl: string;
}): void {
	for (const url of new Set([result.url, result.previewUrl])) {
		URL.revokeObjectURL(url);
	}
}
