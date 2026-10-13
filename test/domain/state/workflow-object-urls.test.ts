import { afterEach, describe, expect, test } from 'vitest';
import {
	releaseUrl,
	revokeResultUrls
} from '../../../src/lib/app/state/workflow/object-urls.ts';

const revoked: string[] = [];
const realRevoke = URL.revokeObjectURL;

afterEach(() => {
	URL.revokeObjectURL = realRevoke;
	revoked.length = 0;
});

function recordRevokes(): void {
	URL.revokeObjectURL = (url: string) => {
		revoked.push(url);
	};
}

describe('releaseUrl', () => {
	test('revokes a URL nobody holds anymore', () => {
		recordRevokes();

		releaseUrl('blob:mock/orphan');

		expect(revoked).toEqual(['blob:mock/orphan']);
	});

	test('keeps a URL the current result still references', () => {
		recordRevokes();

		releaseUrl('blob:mock/kept', new Set(['blob:mock/kept']));

		expect(revoked).toEqual([]);
	});

	test('ignores an absent URL', () => {
		recordRevokes();

		releaseUrl(null);

		expect(revoked).toEqual([]);
	});
});

describe('revokeResultUrls', () => {
	test('releases both addresses of a result', () => {
		recordRevokes();

		revokeResultUrls({
			url: 'blob:mock/final',
			previewUrl: 'blob:mock/preview'
		});

		expect(revoked).toEqual(['blob:mock/final', 'blob:mock/preview']);
	});

	test('releases a shared address exactly once', () => {
		recordRevokes();

		revokeResultUrls({
			url: 'blob:mock/shared',
			previewUrl: 'blob:mock/shared'
		});

		expect(revoked).toEqual(['blob:mock/shared']);
	});
});
