<script lang="ts">
	import Hero from '#lib/widgets/Hero.svelte';
	import ImageInputs from '#lib/widgets/ImageInputs.svelte';
	import ResultPanel from '#lib/widgets/ResultPanel.svelte';
	import RecolorButton from '#lib/components/RecolorButton.svelte';

	let palette = $state<File | null>(null);
	let sprite = $state<File | null>(null);

	let ready = $derived(palette !== null && sprite !== null);
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
	<Hero />
	<ImageInputs bind:palette bind:sprite />
	<RecolorButton disabled={!ready} />
	<ResultPanel />
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
