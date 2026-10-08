<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Link from '#lib/components/Link.svelte';

	const isHome = $derived(page.url.pathname === '/');
</script>

<footer class="flex gap-6 pb-6 text-base">
	{#if isHome}
		<Link href={resolve('/settings')}>Settings</Link>
	{:else}
		<Link href={resolve('/')}>Home</Link>
	{/if}
	<Link href={resolve('/privacy')}>Privacy</Link>
	<Link
		href="https://github.com/SirCesarium/re-color"
		variant="muted"
		target="_blank"
		rel="noreferrer"
	>Source on GitHub</Link>
</footer>
