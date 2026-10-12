// Tracks the object URLs the code under test creates and revokes, so a test
// can assert every URL is released exactly once and none leak. jsdom does not
// implement createObjectURL, so the workflow's URL handling can only be
// exercised through this seam.

let created: string[] = [];
let revoked: string[] = [];

/** Puts the tracking fakes on the global URL object. Called from setup. */
export function installObjectUrlTracking(): void {
	URL.createObjectURL = () => {
		const url = `blob:mock/${created.length + 1}`;
		created.push(url);

		return url;
	};

	URL.revokeObjectURL = (url: string) => {
		revoked.push(url);
	};
}

export function resetObjectUrlTracking(): void {
	created = [];
	revoked = [];
}

export function createdObjectUrls(): readonly string[] {
	return created;
}

export function revokedObjectUrls(): readonly string[] {
	return revoked;
}

/** URLs created but never revoked — anything here has leaked. */
export function leakedObjectUrls(): readonly string[] {
	return created.filter(url => !revoked.includes(url));
}
