<script lang="ts">
	import { resolve } from '$app/paths';
	import Link from '#lib/components/Link.svelte';
	import Typography from '#lib/components/Typography.svelte';
	import { t } from 'svelte-i18n';
</script>

<svelte:head>
	<title>{$t('privacy.title')}</title>
	<meta name="description" content={$t('privacy.metaDescription')} />
	<link rel="canonical" href="https://recolor.pages.dev/privacy" />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="re::color" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:url" content="https://recolor.pages.dev/privacy" />
	<meta property="og:title" content={$t('privacy.title')} />
	<meta property="og:description" content={$t('privacy.ogDescription')} />
	<meta property="og:image" content="https://recolor.pages.dev/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={$t('meta.ogAlt')} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={$t('privacy.title')} />
	<meta name="twitter:description" content={$t('privacy.ogDescription')} />
	<meta name="twitter:image" content="https://recolor.pages.dev/og.png" />
	<meta name="twitter:image:alt" content={$t('meta.ogAlt')} />
</svelte:head>

<main class="box-border flex w-full max-w-[560px] flex-1 flex-col items-center gap-6 px-4 py-12 text-center">
	<Typography as="h1" variant="page-title">{$t('privacy.h1')}</Typography>

	<Typography class="max-w-[44ch]" variant="body">
		{$t('privacy.intro')}
	</Typography>

	<Typography class="max-w-[44ch]" variant="muted">
		{$t('privacy.images')}
	</Typography>

	<Typography class="max-w-[44ch]" variant="muted">
		{$t('privacy.noAccounts')}
	</Typography>

	<Typography class="max-w-[44ch]" variant="muted">
		{$t('privacy.source')}
		<Link
			href="https://github.com/SirCesarium/re-color"
			variant="accent"
			target="_blank"
			rel="noreferrer">{$t('privacy.repo')}</Link
		>
	</Typography>

	<Link class="mt-2" href={resolve('/')}>{$t('privacy.back')}</Link>
</main>
