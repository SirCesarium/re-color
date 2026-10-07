<script lang="ts">
	import { onMount, untrack } from "svelte";
	import Hero from "#lib/widgets/Hero.svelte";
	import ImageInputs from "#lib/widgets/ImageInputs.svelte";
	import ResultPanel from "#lib/widgets/ResultPanel.svelte";
	import Button from "#lib/components/Button.svelte";
	import ButtonGroup from "#lib/components/ButtonGroup.svelte";
	import Hint from "#lib/components/Hint.svelte";
	import Typography from "#lib/components/Typography.svelte";
	import { extractColors } from "#lib/canvas.ts";
	import { recolor } from "#lib/recolor.ts";
	import type { MappingMode, PaletteColor } from "#lib/color.ts";

	const MAPPING_STORAGE_KEY = "recolor.mapping";
	const MAPPING_OPTIONS: { value: MappingMode; label: string }[] = [
		{ value: "nearest", label: "Nearest color" },
		{ value: "luminance", label: "Luminance order" },
		{ value: "dominant", label: "Dominant color" },
	];

	let palette = $state<File | null>(null);
	let sprite = $state<File | null>(null);
	let colors = $state<PaletteColor[]>([]);
	let mapping = $state<MappingMode>("luminance");
	let result = $state<{ url: string } | null>(null);
	let busy = $state(false);
	let progress = $state(0);
	let hint = $state<string | null>(null);
	let mappingLoaded = $state(false);

	let ready = $derived(palette !== null && sprite !== null);
	let activeColors = $derived(colors.filter((color) => color.active).length);
	let noActiveColors = $derived(activeColors === 0);
	let mappingSig = $derived(
		`${mapping}:${colors.map((color) => (color.active ? "1" : "0")).join("")}`,
	);
	let buttonHint = $derived(
		ready && noActiveColors ? "Select at least 1 color" : hint,
	);

	let runId = 0;

	onMount(() => {
		const stored = localStorage.getItem(MAPPING_STORAGE_KEY);
		const option = MAPPING_OPTIONS.find(
			(candidate) => candidate.value === stored,
		);
		if (option) mapping = option.value;
		mappingLoaded = true;
	});

	$effect(() => {
		if (!mappingLoaded) return;
		localStorage.setItem(MAPPING_STORAGE_KEY, mapping);
	});

	function clearResult() {
		if (result) URL.revokeObjectURL(result.url);
		result = null;
	}

	function downloadResult() {
		if (!result || !sprite) return;

		const name = sprite.name.replace(/\.[^.]+$/, "") || "sprite";
		const link = document.createElement("a");
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
				() => id !== runId,
			);

			if (id !== runId || url === null) return;

			clearResult();
			result = { url };
		} catch (error) {
			console.error(error);
			if (id === runId) hint = "Recolor failed";
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
	<link rel="canonical" href="https://recolor.pages.dev/" />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="re::color" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:url" content="https://recolor.pages.dev/" />
	<meta property="og:title" content="re::color" />
	<meta
		property="og:description"
		content="Recolor a sprite with any image's palette. Runs entirely on your device."
	/>
	<meta property="og:image" content="https://recolor.pages.dev/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="re::color wordmark above the tagline Recolor a sprite with any image's palette, over a row of seven palette colors."
	/>

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="re::color" />
	<meta
		name="twitter:description"
		content="Recolor a sprite with any image's palette. Runs entirely on your device."
	/>
	<meta name="twitter:image" content="https://recolor.pages.dev/og.png" />
	<meta
		name="twitter:image:alt"
		content="re::color wordmark above the tagline Recolor a sprite with any image's palette, over a row of seven palette colors."
	/>
</svelte:head>

<main
	class="box-border flex w-full flex-1 flex-col items-center justify-center gap-8 px-4 py-12 min-[900px]:mx-auto min-[900px]:grid min-[900px]:max-w-[1040px] min-[900px]:grid-cols-[1fr_1fr] min-[900px]:content-center min-[900px]:justify-items-start min-[900px]:gap-x-16 min-[900px]:gap-y-8"
>
	<Hero bind:colors />
	<ImageInputs bind:palette bind:sprite />
	<div
		class="animate-[rise_380ms_ease-out_160ms_backwards] flex w-full max-w-[480px] flex-col gap-4 min-[900px]:col-start-1 min-[900px]:justify-self-stretch"
	>
		<Button
			disabled={!ready || noActiveColors}
			{busy}
			{progress}
			onclick={handleRecolor}
		>
			recolor!
		</Button>
		<Hint text={buttonHint} />
	</div>
	<div
		class="flex w-full max-w-[480px] flex-col gap-4 min-[900px]:col-start-2 min-[900px]:row-start-1 min-[900px]:row-end-[span_3] min-[900px]:self-center min-[900px]:justify-self-stretch"
	>
		<section
			class="animate-[rise_380ms_ease-out_200ms_backwards] flex w-full max-w-[480px] flex-col gap-2"
			aria-label="Color mapping"
		>
			<Typography as="span" variant="section-label">Mapping</Typography>
			<ButtonGroup
				bind:value={mapping}
				options={MAPPING_OPTIONS}
				label="Color mapping"
			/>
		</section>
		<ResultPanel
			imageUrl={result?.url ?? null}
			onDownload={downloadResult}
		/>
	</div>
</main>
