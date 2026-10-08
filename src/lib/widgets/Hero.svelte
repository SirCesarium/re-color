<script lang="ts">
	import Wordmark from '#lib/components/Wordmark.svelte';
	import Typography from '#lib/components/Typography.svelte';
	import PaletteStrip from '#lib/widgets/PaletteStrip.svelte';
	import { t } from 'svelte-i18n';
	import type { PaletteColor } from '#lib';

	let { colors = $bindable([]) }: { colors: PaletteColor[] } = $props();
</script>

<header
	class="animate-[rise_380ms_ease-out_backwards] w-full text-center min-[900px]:col-start-1 min-[900px]:text-left"
>
	<Wordmark />
	<Typography variant="tagline">
		{$t('hero.tagline1')}<br />{$t('hero.tagline2')}
	</Typography>
	<PaletteStrip bind:colors />
</header>

<style>
	@media (min-width: 900px) {
		header :global(.wrap) {
			justify-content: flex-start;
		}

		header :global(.hint.above) {
			margin-inline: 0 auto;
		}
	}
</style>
