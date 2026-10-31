<script lang="ts">
	import { t } from 'svelte-i18n';
	import Typography from '#app/components/Typography.svelte';
	import Wordmark from '#app/components/Wordmark.svelte';
	import PaletteStrip from '#app/widgets/PaletteStrip.svelte';
	import type { PaletteColor } from '#lib';

	let { colors = $bindable([]) }: { colors: PaletteColor[] } = $props();
</script>

<header
	class="w-full animate-[rise_380ms_ease-out_backwards] text-center min-[900px]:col-start-1 min-[900px]:text-left"
>
	<Wordmark />
	<Typography as="h1" variant="tagline">
		{$t('hero.tagline1')}<br />{$t('hero.tagline2')}
	</Typography>
	<PaletteStrip
		bind:colors
		class="min-[900px]:justify-start [&_.hint.above]:min-[900px]:mx-0 [&_.hint.above]:min-[900px]:mr-auto"
	/>
</header>
