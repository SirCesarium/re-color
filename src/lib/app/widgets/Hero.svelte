<script lang="ts">
	import { t } from 'svelte-i18n';
	import Typography from '#app/components/Typography.svelte';
	import Wordmark from '#app/components/Wordmark.svelte';
	import PaletteStrip from '#app/widgets/PaletteStrip.svelte';
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
