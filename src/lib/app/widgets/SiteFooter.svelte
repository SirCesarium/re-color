<script lang="ts">
	import Link from '#app/components/Link.svelte';
	import Typography from '#app/components/Typography.svelte';
	import Wordmark from '#app/components/Wordmark.svelte';
	import { t } from '#app/text/index.ts';
	import { page } from '$app/state';

	const path = $derived(page.url.pathname);
	const isHome = $derived(path === '/');
</script>

<footer class="w-full border-t-2 border-border bg-panel-sunken">
	<div
		class="mx-auto flex w-full max-w-260 flex-col gap-8 px-4 py-12 min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between min-[900px]:py-16"
	>
		<div class="flex flex-col gap-2">
			<Wordmark />
			<Typography as="p" variant="muted">{t('hero.tagline1')} {t('hero.tagline2')}</Typography>
		</div>

		<nav
			aria-label={t('footer.nav')}
			class="flex flex-col gap-2 text-sm min-[640px]:flex-row min-[640px]:items-center min-[640px]:gap-6"
		>
			{#if isHome}
				<Link class="whitespace-nowrap" href="/settings/">{t('footer.settings')}</Link>
			{:else}
				<Link class="whitespace-nowrap" href="/">{t('footer.home')}</Link>
			{/if}
			<Link class="whitespace-nowrap" href="/privacy/">{t('footer.privacy')}</Link>
			<Link
				class="whitespace-nowrap"
				href="https://github.com/SirCesarium/re-color"
				variant="muted"
				target="_blank"
				rel="noreferrer">{t('footer.source')}</Link
			>
		</nav>
	</div>
</footer>
