<script lang="ts">
	import Wordmark from '#lib/components/Wordmark.svelte';
	import Typography from '#lib/components/Typography.svelte';
	import PaletteStrip from '#lib/widgets/PaletteStrip.svelte';
	import type { PaletteColor } from '#lib/color.ts';

	let { colors = $bindable([]) }: { colors: PaletteColor[] } = $props();
</script>

<header class="animate-[rise_380ms_ease-out_backwards] text-center min-[900px]:col-start-1 min-[900px]:text-left">
	<Wordmark />
	<Typography variant="tagline">
		Recolor a sprite<br />with any image's palette.
	</Typography>
	<PaletteStrip bind:colors />
</header>

<style>
	@media (min-width: 900px) {
		header :global(.wrap) {
			justify-content: flex-start;
		}
	}
</style>
