<script lang="ts">
	import Link from '#app/components/Link.svelte';
	import { t } from '#app/text/index.ts';

	let { visible = false }: { visible?: boolean } = $props();

	const sections = [
		{ href: '#how', label: t('sections.how.title') },
		{ href: '#examples', label: t('sections.examples.title') },
		{ href: '#limits', label: t('sections.limits.title') }
	];
</script>

<header
	class="fixed inset-x-0 top-0 z-40 bg-panel transition-transform duration-200 ease-out {visible
		? 'translate-y-0 shadow-[0_6px_0_var(--shadow)]'
		: '-translate-y-full shadow-none'}"
	inert={!visible}
>
	<div
		class="mx-auto flex h-14 w-full max-w-260 items-center justify-between gap-4 px-4 leading-none"
	>
		<a
			class="block text-lg leading-none text-text [text-shadow:3px_3px_0_var(--shadow)] hover:text-accent min-[640px]:text-xl"
			href="/"
			aria-label={t('topbar.home')}
		>
			re<span class="text-pop">::</span>color
		</a>

		<div class="flex items-center gap-6 text-sm leading-none">
			<nav aria-label={t('topbar.sections')} class="hidden items-center gap-6 min-[720px]:flex">
				{#each sections as section (section.href)}
					<Link class="whitespace-nowrap" href={section.href}>{section.label}</Link>
				{/each}
			</nav>

			<nav aria-label={t('topbar.links')} class="flex items-center gap-4 min-[640px]:gap-6">
				<Link
					class="whitespace-nowrap"
					href="https://github.com/SirCesarium/re-color"
					variant="muted"
					target="_blank"
					rel="noreferrer">{t('topbar.source')}</Link
				>
				<Link class="whitespace-nowrap" href="/privacy/">{t('topbar.privacy')}</Link>
			</nav>
		</div>
	</div>
</header>
