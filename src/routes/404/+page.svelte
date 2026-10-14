<script lang="ts">
	import { t } from 'svelte-i18n';
	import Link from '#app/components/Link.svelte';
	import Typography from '#app/components/Typography.svelte';
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>{$t('notFound.title')}</title>
	<meta name="description" content={$t('notFound.metaDescription')} />
	<meta name="robots" content="noindex" />
</svelte:head>

<main
	class="box-border flex w-full max-w-140 flex-1 flex-col items-center gap-6 px-4 py-12 text-center"
>
	<Typography as="h1" variant="page-title">{$t('notFound.h1')}</Typography>

	<Typography class="max-w-[44ch]" variant="body">{$t('notFound.message')}</Typography>

	<Link class="mt-2" href={resolve('/')}>{$t('notFound.back')}</Link>
</main>
