/** A `localStorage` stand-in backed by a map, since bun does not expose one in tests. */

/** Provides an in-memory `localStorage` while the global is missing. */
export function installFakeLocalStorage(): () => void {
	const globals = globalThis as Record<string, unknown>;
	const previous = globals.localStorage;
	const store = new Map<string, string>();

	globals.localStorage = {
		getItem(key: string): string | null {
			return store.has(key) ? (store.get(key) as string) : null;
		},
		setItem(key: string, value: string): void {
			store.set(key, String(value));
		},
		removeItem(key: string): void {
			store.delete(key);
		},
		clear(): void {
			store.clear();
		},
		key(index: number): string | null {
			return [...store.keys()][index] ?? null;
		},
		get length(): number {
			return store.size;
		}
	};

	return () => {
		if (previous === undefined) {
			delete globals.localStorage;
		} else {
			globals.localStorage = previous;
		}
	};
}
