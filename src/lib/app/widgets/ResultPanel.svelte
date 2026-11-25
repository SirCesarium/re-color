<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '#app/components/Button.svelte';
	import Hint from '#app/components/Hint.svelte';
	import Typography from '#app/components/Typography.svelte';
	import { hintsEnabled } from '#app/state/hints.ts';
	import type { PixelPaintMode } from '#app/state/workflow/paint.ts';
	import { t } from '#app/text/index.ts';
	import PixelCanvas from '#app/widgets/PixelCanvas.svelte';

	let {
		imageUrl = null,
		spriteFile = null,
		excludedPixels = [],
		brushSize = $bindable(1),
		paintMode = $bindable<PixelPaintMode>('toggle'),
		locked = $bindable(true),
		onTogglePixel,
		onPaintPixels,
		onDownload
	}: {
		imageUrl?: string | null;
		spriteFile?: File | null;
		excludedPixels?: readonly number[];
		brushSize?: number;
		paintMode?: PixelPaintMode;
		locked?: boolean;
		onTogglePixel?: (pixelIndex: number) => void;
		onPaintPixels?: (pixelIndexes: readonly number[], mode: PixelPaintMode) => void;
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

		// Same rule as the palette strip: a hidden help bubble must not mark
		// itself consumed, or re-enabling hints would find it already spent.
		if (!$hintsEnabled) return;

		helpSeen = true;
		helpVisible = true;
		localStorage.setItem(HELP_STORAGE_KEY, 'true');
	});

	function dismissHelp() {
		helpVisible = false;
	}
</script>

<section
	class="flex w-full max-w-120 animate-[rise_380ms_ease-out_240ms_backwards] flex-col gap-2"
	aria-label={t('result.section')}
>
	<Typography as="span" variant="section-label">{t('result.section')}</Typography>
	<div
		class="group/result relative flex aspect-square h-auto items-center justify-center overflow-hidden border border-border bg-panel-sunken"
	>
		<div
			class="pointer-events-none absolute inset-0 opacity-35 checker-pattern group-hover/result:animate-[drift_4s_linear_infinite]"
		></div>
		<PixelCanvas
			{imageUrl}
			{spriteFile}
			{excludedPixels}
			bind:brushSize
			bind:paintMode
			bind:locked
			{onTogglePixel}
			{onPaintPixels}
		/>

		{#if imageUrl && locked}
			<div
				class="pointer-events-none absolute bottom-1 left-1 z-10 hidden border-2 border-btn-edge bg-panel px-1.5 py-0.5 text-xs text-[var(--sw-red)] shadow-[2px_2px_0_var(--btn-shadow)] pointer-coarse:block"
			>
				{t('paint.canvasLocked')}
			</div>
		{/if}
		{#if imageUrl}
			{#if helpVisible}
				<div class="absolute top-2 right-2 left-2 z-10">
					<Hint
						class="text-left text-xs leading-[1.35]"
						arrow="down"
						tailOffset="18px"
						hintsEnabled={$hintsEnabled}
						text={t('result.pixelHelp')}
						onDismiss={dismissHelp}
					/>
				</div>
			{/if}
		{/if}
	</div>
	<div class="min-h-12">
		{#if imageUrl}
			<div class="animate-[rise_200ms_ease-out]">
				<Button onclick={onDownload}>{t('result.download')}</Button>
			</div>
		{/if}
	</div>
</section>
