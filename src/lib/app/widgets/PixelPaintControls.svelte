<script lang="ts">
	import PixelSlider from '#app/components/PixelSlider.svelte';
	import SwitchButton from '#app/components/SwitchButton.svelte';
	import type { PixelPaintMode } from '#app/state/workflow/paint.ts';
	import { t } from '#app/text/index.ts';

	let {
		brushSize = $bindable(1),
		paintMode = $bindable<PixelPaintMode>('toggle'),
		locked = $bindable<boolean | undefined>(undefined),
		onClose
	}: {
		brushSize?: number;
		paintMode?: PixelPaintMode;
		locked?: boolean;
		onClose?: () => void;
	} = $props();

	const MODES = [
		{ value: 'disable', labelKey: 'paint.disable' },
		{ value: 'enable', labelKey: 'paint.enable' },
		{ value: 'toggle', labelKey: 'paint.toggle' }
	] as const;
</script>

<div class="flex flex-col gap-2.5 p-3" role="group" aria-label={t('paint.aria')}>
	<div class="flex items-start justify-between gap-2 border-b border-border pb-1.5">
		<span class="text-xs font-bold text-ok">{t('paint.title')}</span>
		{#if onClose}
			<button
				type="button"
				class="-mt-1.5 shrink-0 cursor-pointer border-0 bg-transparent p-0.5 text-xl leading-none text-pop"
				aria-label={t('paint.close')}
				onclick={onClose}
			>
				&times;
			</button>
		{/if}
	</div>

	{#if locked !== undefined}
		<div class="flex items-center justify-between gap-3">
			<span class="text-xs {locked ? 'text-[var(--sw-red)]' : 'text-text-dim'}">
				{t('paint.disableBrush')}
			</span>
			<SwitchButton
				checked={locked}
				label={t('paint.disableBrush')}
				onchange={(value) => (locked = value)}
			/>
		</div>
	{/if}

	<PixelSlider
		value={brushSize}
		min={1}
		max={15}
		label={t('paint.size')}
		onchange={(value) => (brushSize = value)}
	/>

	<div class="flex flex-col gap-2 border-t border-border pt-2.5">
		<span class="text-[11px] text-text-dim">{t('paint.type')}</span>
		<div class="grid grid-cols-3 gap-1" role="group" aria-label={t('paint.type')}>
			{#each MODES as mode (mode.value)}
				{@const selected = paintMode === mode.value}
				<button
					type="button"
					aria-pressed={selected}
					onclick={() => (paintMode = mode.value)}
					class="cursor-pointer border-2 px-1 py-1 text-[11px] {selected
						? 'border-btn-edge bg-btn-bg text-btn-fg shadow-[2px_2px_0_var(--btn-shadow)]'
						: 'border-border bg-panel-sunken text-text-dim'}"
				>
					{t(mode.labelKey)}
				</button>
			{/each}
		</div>
	</div>
</div>
