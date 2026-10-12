// The workflow restores its workspace from IndexedDB in onMount, so the suite
// needs a working (fake) IndexedDB to avoid a failure on every mount.
import 'fake-indexeddb/auto';

import { beforeEach } from 'vitest';
import {
	installObjectUrlTracking,
	resetObjectUrlTracking
} from './support/object-urls.ts';

installObjectUrlTracking();

beforeEach(() => {
	resetObjectUrlTracking();
});
