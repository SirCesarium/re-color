export const SITE_URL = 'https://recolor.pages.dev';

export function absoluteUrl(path: string): string {
	return `${SITE_URL}${path}`;
}
