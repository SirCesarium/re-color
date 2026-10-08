import { writable } from 'svelte/store';
import { APP_SETTINGS_KEY, parseAppSettings } from './app-settings.ts';

function initialHints(): boolean {
	if (typeof localStorage === 'undefined') return true;

	try {
		return parseAppSettings(localStorage.getItem(APP_SETTINGS_KEY)).hintsEnabled;
	} catch {
		return true;
	}
}

/** Global toggle for the help bubbles, synced with the saved settings. */
export const hintsEnabled = writable(initialHints());
