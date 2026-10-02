<script lang="ts">
	import Wordmark from '#lib/components/Wordmark.svelte';
	import PaletteStrip from '#lib/components/PaletteStrip.svelte';
	import type { PaletteColor } from '#lib/color.ts';

	let { colors = $bindable([]) }: { colors: PaletteColor[] } = $props();
</script>

<header class="hero">
	<Wordmark />
	<p class="tagline">Recolor a sprite<br />with any image's palette.</p>
	<PaletteStrip bind:colors />
</header>

<style>
	.hero {
		text-align: center;
		animation: rise 380ms ease-out backwards;
	}

	.tagline {
		margin: 16px 0 0;
		font-size: 16px;
		line-height: 1.5;
		color: var(--text-dim);
	}

	@media (min-width: 900px) {
		.hero {
			grid-column: 1;
			text-align: left;
		}

		.hero :global(.wrap) {
			justify-content: flex-start;
		}
	}
</style>
