import { writable } from 'svelte/store';
import { APP_SETTINGS_KEY, parseAppSettings } from './settings/repository.ts';

function initialHints(): boolean {
	if (typeof localStorage === 'undefined') return true;

	try {
		return parseAppSettings(localStorage.getItem(APP_SETTINGS_KEY))
			.hintsEnabled;
	} catch {
		return true;
	}
}

/** Store for the help bubbles, kept in sync with the saved settings. */
export const hintsEnabled = writable(initialHints());
