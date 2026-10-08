<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Link from '#lib/components/Link.svelte';
	import { t } from 'svelte-i18n';

	const isHome = $derived(page.url.pathname === '/');
</script>

<footer class="flex gap-6 pb-6 text-base">
	{#if isHome}
		<Link href={resolve('/settings')}>{$t('footer.settings')}</Link>
	{:else}
		<Link href={resolve('/')}>{$t('footer.home')}</Link>
	{/if}
	<Link href={resolve('/privacy')}>{$t('footer.privacy')}</Link>
	<Link
		href="https://github.com/SirCesarium/re-color"
		variant="muted"
		target="_blank"
		rel="noreferrer"
	>{$t('footer.source')}</Link>
</footer>
