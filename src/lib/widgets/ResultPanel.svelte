<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '#lib/components/Button.svelte';
	import Hint from '#lib/components/Hint.svelte';
	import Typography from '#lib/components/Typography.svelte';
	import PixelCanvas from '#lib/widgets/PixelCanvas.svelte';
	import { t } from 'svelte-i18n';

	let {
		imageUrl = null,
		spriteFile = null,
		excludedPixels = [],
		onTogglePixel,
		onSetPixelExclusion,
		onDownload
	}: {
		imageUrl?: string | null;
		spriteFile?: File | null;
		excludedPixels?: readonly number[];
		onTogglePixel?: (pixelIndex: number) => void;
		onSetPixelExclusion?: (pixelIndexes: readonly number[], excluded: boolean) => void;
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
	class="animate-[rise_380ms_ease-out_240ms_backwards] flex w-full max-w-120 flex-col gap-2"
	aria-label={$t('result.section')}
>
	<Typography as="span" variant="section-label">{$t('result.section')}</Typography>
	<div
		class="result relative flex aspect-square h-auto items-center justify-center overflow-hidden border border-border bg-panel-sunken"
	>
		<div class="checker"></div>
		<PixelCanvas
			{imageUrl}
			{spriteFile}
			{excludedPixels}
			{onTogglePixel}
			{onSetPixelExclusion}
			onInteract={dismissHelp}
		/>

		{#if imageUrl}
			{#if helpVisible}
				<div class="help-anchor absolute top-2 left-2 right-2 z-10">
					<Hint
						class="pixel-help"
						arrow="down"
						text={$t('result.pixelHelp')}
						onDismiss={dismissHelp}
					/>
				</div>
			{/if}
		{/if}
	</div>
	{#if imageUrl}
		<Button onclick={onDownload}>{$t('result.download')}</Button>
	{/if}
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
		text-align: left;
		font-size: 12px;
		line-height: 1.35;
	}

	.help-anchor :global(.pixel-help .tail) {
		left: 18px;
	}
</style>
