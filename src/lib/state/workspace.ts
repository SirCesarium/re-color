import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type { MappingMode } from '../image-processing/types.ts';

export type PersistedWorkspace = {
	palette: { name: string; blob: Blob } | null;
	sprite: { name: string; blob: Blob } | null;
	mapping: MappingMode;
	colors: { r: number; g: number; b: number; active: boolean }[];
	excludedPixels: number[];
};

const DATABASE = 'recolor-workspace';
const DATABASE_VERSION = 1;
const STORE = 'state';
const WORKSPACE_KEY = 'current';

interface WorkspaceDatabase extends DBSchema {
	state: {
		key: string;
		value: PersistedWorkspace;
	};
}

let databasePromise: Promise<IDBPDatabase<WorkspaceDatabase>> | undefined;

/** One shared connection; it reopens after a failure or an upgrade in another tab. */
function openDatabase(): Promise<IDBPDatabase<WorkspaceDatabase>> {
	databasePromise ??= openDB<WorkspaceDatabase>(DATABASE, DATABASE_VERSION, {
		upgrade(database) {
			database.createObjectStore(STORE);
		}
	}).then(
		database => {
			database.addEventListener('versionchange', () => {
				database.close();
				databasePromise = undefined;
			});

			return database;
		},
		error => {
			databasePromise = undefined;
			throw error;
		}
	);

	return databasePromise;
}

export async function loadWorkspace(): Promise<PersistedWorkspace | null> {
	const database = await openDatabase();
	const workspace = await database.get(STORE, WORKSPACE_KEY);

	return workspace ?? null;
}

export async function saveWorkspace(
	workspace: PersistedWorkspace
): Promise<void> {
	const database = await openDatabase();

	await database.put(STORE, workspace, WORKSPACE_KEY);
}

export async function clearWorkspace(): Promise<void> {
	const database = await openDatabase();

	await database.clear(STORE);
}
