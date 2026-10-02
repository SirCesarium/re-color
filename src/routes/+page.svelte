<script lang="ts">
	import { untrack } from 'svelte';
	import Hero from '#lib/widgets/Hero.svelte';
	import ImageInputs from '#lib/widgets/ImageInputs.svelte';
	import ResultPanel from '#lib/widgets/ResultPanel.svelte';
	import RecolorButton from '#lib/components/RecolorButton.svelte';
	import MappingPicker from '#lib/components/MappingPicker.svelte';
	import { extractColors } from '#lib/canvas.ts';
	import { recolor } from '#lib/recolor.ts';
	import type { MappingMode, PaletteColor } from '#lib/color.ts';

	let palette = $state<File | null>(null);
	let sprite = $state<File | null>(null);
	let colors = $state<PaletteColor[]>([]);
	let mapping = $state<MappingMode>('luminance');
	let result = $state<{ url: string } | null>(null);
	let busy = $state(false);
	let progress = $state(0);
	let hint = $state<string | null>(null);

	let ready = $derived(palette !== null && sprite !== null);
	let activeColors = $derived(colors.filter((color) => color.active).length);
	let noActiveColors = $derived(activeColors === 0);
	let mappingSig = $derived(
		`${mapping}:${colors.map((color) => (color.active ? '1' : '0')).join('')}`
	);
	let buttonHint = $derived(ready && noActiveColors ? 'Select at least 1 color' : hint);

	let runId = 0;

	function clearResult() {
		if (result) URL.revokeObjectURL(result.url);
		result = null;
	}

	function downloadResult() {
		if (!result || !sprite) return;

		const name = sprite.name.replace(/\.[^.]+$/, '') || 'sprite';
		const link = document.createElement('a');
		link.href = result.url;
		link.download = `${name}-recolored.png`;
		link.click();
	}

	async function startRecolor() {
		const file = sprite;
		if (!file) return;

		const id = ++runId;
		busy = true;
		progress = 0;
		hint = null;

		try {
			const url = await recolor(
				file,
				colors,
				mapping,
				(fraction) => {
					if (id === runId) progress = fraction;
				},
				() => id !== runId
			);

			if (id !== runId || url === null) return;

			clearResult();
			result = { url };
		} catch (error) {
			console.error(error);
			if (id === runId) hint = 'Recolor failed';
		} finally {
			if (id === runId) {
				busy = false;
				progress = 0;
			}
		}
	}

	function handleRecolor() {
		if (!ready || noActiveColors || busy) return;
		void startRecolor();
	}

	$effect(() => {
		void palette;
		void sprite;

		untrack(() => {
			runId++;
			clearResult();
			busy = false;
			progress = 0;
			hint = null;
		});
	});

	$effect(() => {
		const signature = mappingSig;

		untrack(() => {
			if (signature && result !== null) void startRecolor();
		});
	});

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
		{busy}
		{progress}
		hint={buttonHint}
		onclick={handleRecolor}
	/>
	<div class="output">
		<MappingPicker bind:mapping />
		<ResultPanel imageUrl={result?.url ?? null} onDownload={downloadResult} />
	</div>
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

	.output {
		display: flex;
		flex-direction: column;
		gap: 16px;
		width: 100%;
		max-width: 480px;
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

		.output {
			grid-column: 2;
			grid-row: 1 / span 3;
			align-self: center;
			justify-self: stretch;
		}
	}
</style>
