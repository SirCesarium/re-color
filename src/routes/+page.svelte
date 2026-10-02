<script lang="ts">
	import Hero from '#lib/widgets/Hero.svelte';
	import ImageInputs from '#lib/widgets/ImageInputs.svelte';
	import ResultPanel from '#lib/widgets/ResultPanel.svelte';
	import RecolorButton from '#lib/components/RecolorButton.svelte';
import { extractColors, type PaletteColor } from '#lib/color.ts';

	let palette = $state<File | null>(null);
	let sprite = $state<File | null>(null);
	let colors = $state<PaletteColor[]>([]);

	let ready = $derived(palette !== null && sprite !== null);
	let activeColors = $derived(colors.filter((color) => color.active).length);
	let noActiveColors = $derived(activeColors === 0);
	let hasResult = $state(false);

	function downloadResult() {
		// placeholder: wired up when the recolor engine lands
	}

	$effect(() => {
		const file = palette;
		if (!file) {
			colors = [];
			return;
		}

		let cancelled = false;
		const url = URL.createObjectURL(file);
		const image = new Image();

		image.onload = () => {
			if (!cancelled) colors = extractColors(image);
		};

		image.src = url;

		return () => {
			cancelled = true;
			URL.revokeObjectURL(url);
		};
	});
</script>

<svelte:head>
	<title>re::color: recolor a sprite with any image's palette</title>
	<meta
		name="description"
		content="Recolor a sprite with any image's palette. Runs entirely on your device, no image is ever uploaded."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:title" content="re::color" />
	<meta
		property="og:description"
		content="Recolor a sprite with any image's palette. Runs entirely on your device."
	/>
</svelte:head>

<main class="home">
	<Hero bind:colors />
	<ImageInputs bind:palette bind:sprite />
	<RecolorButton
		disabled={!ready || noActiveColors}
		hint={ready && noActiveColors ? 'Select at least 1 color' : null}
	/>
	<ResultPanel ready={hasResult} onDownload={downloadResult} />
</main>

<style>
	main {
		flex: 1;
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 32px;
		padding: 48px 16px;
		box-sizing: border-box;
	}

	@media (min-width: 900px) {
		main {
			display: grid;
			grid-template-columns: 1fr 1fr;
			align-content: center;
			justify-items: start;
			gap: 32px 64px;
			max-width: 1040px;
			margin: 0 auto;
		}
	}
</style>
