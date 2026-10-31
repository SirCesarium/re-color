<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import Button from '#app/components/Button.svelte';
	import Hint from '#app/components/Hint.svelte';
	import Typography from '#app/components/Typography.svelte';
	import { hintsEnabled } from '#app/state/hints.ts';
	import PixelCanvas from '#app/widgets/PixelCanvas.svelte';

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
	aria-label={$t('result.section')}
>
	<Typography as="span" variant="section-label">{$t('result.section')}</Typography>
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
			{onTogglePixel}
			{onSetPixelExclusion}
			onInteract={dismissHelp}
		/>

		{#if imageUrl}
			{#if helpVisible}
				<div class="absolute top-2 right-2 left-2 z-10">
					<Hint
						class="text-left text-xs leading-[1.35]"
						arrow="down"
						tailOffset="18px"
						hintsEnabled={$hintsEnabled}
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
