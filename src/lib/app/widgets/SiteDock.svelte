<script lang="ts">
	import Link from '#app/components/Link.svelte';
	import { t } from '#app/text/index.ts';
</script>

<div class="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex justify-center px-4">
	<nav
		aria-label={t('footer.nav')}
		class="pointer-events-auto flex max-w-full items-center gap-x-3 border-2 border-btn-edge bg-panel px-3 py-2 text-[10px] shadow-[4px_4px_0_var(--btn-shadow)] min-[380px]:gap-x-4 min-[380px]:px-4 min-[380px]:text-xs min-[640px]:gap-x-6 min-[640px]:px-5 min-[640px]:text-sm"
	>
		<Link class="whitespace-nowrap" href="/settings/">{t('footer.settings')}</Link>
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
