<script lang="ts">
	import type { Snippet } from 'svelte';
	import { t } from 'svelte-i18n';

	let {
		variant = 'primary',
		type = 'button',
		disabled = false,
		busy = false,
		progress = 0,
		busyLabel,
		cancelLabel,
		cancelOnBusy = false,
		ariaLabel,
		revealOnHover = false,
		class: className = '',
		onclick,
		children
	}: {
		variant?: 'primary' | 'icon';
		type?: 'button' | 'submit' | 'reset';
		disabled?: boolean;
		busy?: boolean;
		progress?: number;
		busyLabel?: string;
		cancelLabel?: string;
		cancelOnBusy?: boolean;
		ariaLabel?: string;
		revealOnHover?: boolean;
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children: Snippet;
	} = $props();

	let fill = $derived(Math.round(progress * 100));

	const primaryClasses = $derived.by(() => {
		const base =
			'relative box-border w-full overflow-hidden px-8 py-3 border-2 text-base font-bold font-[inherit] [transition:box-shadow_80ms_ease-out,background-color_120ms_linear]';

		if (busy && cancelOnBusy) {
			return `${base} group/cancel border-btn-edge bg-btn-bg text-btn-fg shadow-[4px_4px_0_var(--btn-shadow)] cursor-progress hover:border-(--sw-red) hover:bg-(--sw-red) hover:text-bg hover:cursor-pointer hover:shadow-[4px_4px_0_color-mix(in_srgb,var(--sw-red)_65%,var(--text))] focus-visible:border-(--sw-red) focus-visible:bg-(--sw-red) focus-visible:text-bg focus-visible:cursor-pointer`;
		}
		if (busy) {
			return `${base} border-btn-edge bg-btn-bg text-btn-fg shadow-[4px_4px_0_var(--btn-shadow)] cursor-progress`;
		}
		if (disabled) {
			return `${base} border-border bg-panel-sunken text-text-dim shadow-[4px_4px_0_var(--border)] cursor-not-allowed`;
		}
		return `${base} border-btn-edge bg-btn-bg text-btn-fg shadow-[4px_4px_0_var(--btn-shadow)] cursor-pointer hover:bg-[color-mix(in_srgb,var(--btn-bg)_85%,white)] hover:shadow-[6px_6px_0_var(--btn-shadow)] active:shadow-[0_0_0_var(--btn-shadow)]`;
	});

	const iconClasses = $derived.by(() => {
		const base =
			'border-2 border-btn-edge bg-btn-bg text-btn-fg shadow-[3px_3px_0_var(--btn-shadow)] cursor-pointer font-[inherit] [transition:opacity_150ms_linear,background-color_120ms_linear] hover:bg-[color-mix(in_srgb,var(--btn-bg)_85%,white)] active:bg-[color-mix(in_srgb,var(--btn-bg)_75%,black)]';
		if (revealOnHover) {
			return `${base} max-hover-hover:opacity-100 max-hover-fine:opacity-100 hover-hover:hover-fine:opacity-0 hover-hover:hover-fine:pointer-events-none hover-hover:hover-fine:focus-visible:opacity-100 hover-hover:hover-fine:focus-visible:pointer-events-auto in-[[.reveal-on-hover:hover]]:opacity-100 in-[[.reveal-on-hover:hover]]:pointer-events-auto`;
		}
		return base;
	});
</script>

<button
	class="{variant === 'primary' ? primaryClasses : iconClasses} {className}"
	{type}
	disabled={disabled || (busy && !cancelOnBusy)}
	aria-busy={busy}
	aria-label={busy && cancelOnBusy ? (cancelLabel ?? $t('button.cancel')) : ariaLabel}
	{onclick}
>
	{#if variant === 'primary'}
		<span
			class="absolute inset-y-0 left-0 transition-[width] duration-120 ease-linear {busy ? 'animate-[fill-sweep_600ms_linear_infinite]' : ''}"
			style="background-color: color-mix(in srgb, var(--btn-fg) 22%, transparent); background-image: repeating-linear-gradient(90deg, color-mix(in srgb, var(--btn-fg) 55%, transparent) 0 8px, transparent 8px 16px)"
			style:width="{fill}%"
		></span>
		<span class="relative z-1">
			{#if busy}
				<span class={cancelOnBusy ? 'group-hover/cancel:hidden group-focus-visible/cancel:hidden' : ''}
					>{busyLabel ?? $t('button.processing')}</span
				>
				{#if cancelOnBusy}
					<span class="hidden group-hover/cancel:inline group-focus-visible/cancel:inline"
						>{cancelLabel ?? $t('button.cancel')}</span
					>
				{/if}
			{:else}
				{@render children()}
			{/if}
		</span>
	{:else}
		{@render children()}
	{/if}
</button>
