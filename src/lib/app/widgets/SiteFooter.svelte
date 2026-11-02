<script lang="ts">
	import Link from '#app/components/Link.svelte';
	import { t } from '#app/text/index.ts';
	import { page } from '$app/state';

	const path = $derived(page.url.pathname);
	const isHome = $derived(path === '/');
</script>

<footer
	class="flex w-full flex-wrap justify-center gap-x-4 gap-y-2 px-4 pb-6 text-center text-sm min-[640px]:gap-6 min-[640px]:text-base"
>
	{#if isHome}
		<Link class="whitespace-nowrap" href="/settings/">
			{t('footer.settings')}
		</Link>
	{:else}
		<Link class="whitespace-nowrap" href="/">{t('footer.home')}</Link>
	{/if}
	<Link class="whitespace-nowrap" href="/privacy/">
		{t('footer.privacy')}
	</Link>
	<Link
		class="whitespace-nowrap"
		href="https://github.com/SirCesarium/re-color"
		variant="muted"
		target="_blank"
		rel="noreferrer">{t('footer.source')}</Link
	>
</footer>
