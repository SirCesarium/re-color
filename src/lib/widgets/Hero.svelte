<script lang="ts">
	import Wordmark from '#lib/components/Wordmark.svelte';
	import PaletteStrip from '#lib/components/PaletteStrip.svelte';
	import type { PaletteColor } from '#lib/color.ts';

	let { colors = $bindable([]) }: { colors: PaletteColor[] } = $props();
</script>

<header class="animate-[rise_380ms_ease-out_backwards] text-center min-[900px]:col-start-1 min-[900px]:text-left">
	<Wordmark />
	<p class="mt-4 text-base leading-6 text-text-dim">Recolor a sprite<br />with any image's palette.</p>
	<PaletteStrip bind:colors />
</header>

<style>
	@media (min-width: 900px) {
		header :global(.wrap) {
			justify-content: flex-start;
		}
	}
</style>
