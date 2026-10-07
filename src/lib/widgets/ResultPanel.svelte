<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '#lib/components/Button.svelte';
	import Hint from '#lib/components/Hint.svelte';
	import Typography from '#lib/components/Typography.svelte';
	import PixelCanvas from '#lib/widgets/PixelCanvas.svelte';

	let {
		imageUrl = null,
		excludedPixels = [],
		onTogglePixel,
		onDownload
	}: {
		imageUrl?: string | null;
		excludedPixels?: readonly number[];
		onTogglePixel?: (pixelIndex: number) => void;
		onDownload?: () => void;
	} = $props();

	let helpReady = $state(false);
	let helpSeen = $state(false);
	let helpVisible = $state(false);

	const HELP_STORAGE_KEY = 'recolor.resultPixelHelpSeen';

	onMount(() => {
		helpSeen = localStorage.getItem(HELP_STORAGE_KEY) === 'true';
		helpReady = true;
	});

	$effect(() => {
		if (!imageUrl || !helpReady || helpSeen) return;

		helpSeen = true;
		helpVisible = true;
		localStorage.setItem(HELP_STORAGE_KEY, 'true');
	});

	function dismissHelp() {
		helpVisible = false;
	}
</script>

<section
	class="animate-[rise_380ms_ease-out_240ms_backwards] flex w-full max-w-[480px] flex-col gap-2"
	aria-label="Result"
>
	<Typography as="span" variant="section-label">Result</Typography>
	<div
		class="result reveal-on-hover relative flex aspect-square h-auto items-center justify-center overflow-hidden border border-border bg-panel-sunken"
	>
		<div class="checker"></div>
		<PixelCanvas {imageUrl} {excludedPixels} {onTogglePixel} onInteract={dismissHelp} />

		{#if imageUrl}
			{#if helpVisible}
				<div class="help-anchor absolute top-2 left-2 right-2 z-10">
					<Hint
						class="pixel-help"
						arrow="down"
						text="Click or tap a pixel to toggle recoloring. Excluded pixels keep their original color. Keyboard: arrows move, Space toggles."
						onDismiss={dismissHelp}
					/>
				</div>
			{/if}

			<Button
				variant="icon"
				class="absolute right-2 bottom-2 z-10 grid h-8 w-8 place-items-center p-0 focus-visible:outline-offset-[3px]"
				ariaLabel="Download result"
				revealOnHover
				onclick={onDownload}
			>
				<svg
					class="h-4 w-4 [shape-rendering:crispEdges]"
					viewBox="0 0 16 16"
					fill="currentColor"
					aria-hidden="true"
				>
					<rect x="6" y="1" width="4" height="6" />
					<rect x="1" y="7" width="14" height="2" />
					<rect x="3" y="9" width="10" height="2" />
					<rect x="5" y="11" width="6" height="2" />
					<rect x="7" y="13" width="2" height="2" />
				</svg>
			</Button>
		{/if}
	</div>
</section>

<style>
	@keyframes drift {
		to {
			background-position: var(--checker-size) var(--checker-size);
		}
	}

	.checker {
		position: absolute;
		inset: 0;
		background:
			conic-gradient(
				var(--panel) 0 25%,
				transparent 0 50%,
				var(--panel) 0 75%,
				transparent 0
			) 0 0 / var(--checker-size) var(--checker-size);
		opacity: 0.35;
	}

	.result:hover .checker {
		animation: drift 4s linear infinite;
	}

	.help-anchor :global(.pixel-help) {
		max-width: 100%;
		white-space: normal;
		text-align: left;
		font-size: 12px;
		line-height: 1.35;
	}

	.help-anchor :global(.pixel-help .tail) {
		left: 18px;
	}
</style>
