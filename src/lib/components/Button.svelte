<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		variant = 'primary',
		type = 'button',
		disabled = false,
		busy = false,
		progress = 0,
		busyLabel = 'processing...',
		cancelLabel = 'cancel',
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
</script>

<button
	class="button button-{variant} {className}"
	class:busy
	class:cancel-on-busy={busy && cancelOnBusy}
	class:revealable={variant === 'icon' && revealOnHover}
	{type}
	disabled={disabled || (busy && !cancelOnBusy)}
	aria-busy={busy}
	aria-label={busy && cancelOnBusy ? cancelLabel : ariaLabel}
	{onclick}
>
	{#if variant === 'primary'}
		<span class="fill absolute inset-y-0 left-0" style:width="{fill}%"></span>
		<span class="label relative z-[1]">
			{#if busy}
				<span class="processing-label">{busyLabel}</span>
				{#if cancelOnBusy}<span class="cancel-label">{cancelLabel}</span>{/if}
			{:else}
				{@render children()}
			{/if}
		</span>
	{:else}
		{@render children()}
	{/if}
</button>

<style>
	.button {
		font-family: inherit;
		transition:
			box-shadow 80ms ease-out,
			background-color 120ms linear;
	}

	.button-primary {
		box-sizing: border-box;
		position: relative;
		width: 100%;
		overflow: hidden;
		padding: 12px 32px;
		border: 2px solid var(--btn-edge);
		background: var(--btn-bg);
		color: var(--btn-fg);
		box-shadow: 4px 4px 0 var(--btn-shadow);
		cursor: pointer;
		font-size: 16px;
		font-weight: 700;
	}

	.fill {
		background-color: color-mix(in srgb, var(--btn-fg) 22%, transparent);
		background-image: repeating-linear-gradient(
			90deg,
			color-mix(in srgb, var(--btn-fg) 55%, transparent) 0 8px,
			transparent 8px 16px
		);
		transition: width 120ms linear;
	}

	.button-primary.busy .fill {
		animation: fill-sweep 600ms linear infinite;
	}

	.button-primary:hover {
		background: color-mix(in srgb, var(--btn-bg) 85%, white);
		box-shadow: 6px 6px 0 var(--btn-shadow);
	}

	.button-primary:active {
		box-shadow: 0 0 0 var(--btn-shadow);
	}

	.button-primary:disabled {
		color: var(--text-dim);
		background: var(--panel-sunken);
		border-color: var(--border);
		box-shadow: 4px 4px 0 var(--border);
		cursor: not-allowed;
	}

	.button-primary:disabled:hover,
	.button-primary:disabled:active {
		background: var(--panel-sunken);
		box-shadow: 4px 4px 0 var(--border);
	}

	.button-primary.busy {
		color: var(--btn-fg);
		background: var(--btn-bg);
		border-color: var(--btn-edge);
		box-shadow: 4px 4px 0 var(--btn-shadow);
		cursor: progress;
	}

	.button-primary.busy:hover,
	.button-primary.busy:active {
		background: var(--btn-bg);
		box-shadow: 4px 4px 0 var(--btn-shadow);
	}

	.button-primary.busy.cancel-on-busy {
		cursor: progress;
	}

	.button-primary.busy.cancel-on-busy:hover,
	.button-primary.busy.cancel-on-busy:focus-visible {
		color: var(--bg);
		background: var(--sw-red);
		border-color: var(--sw-red);
		box-shadow: 4px 4px 0 color-mix(in srgb, var(--sw-red) 65%, var(--text));
		cursor: pointer;
	}

	.cancel-label {
		display: none;
	}

	.button-primary.busy.cancel-on-busy:hover .processing-label,
	.button-primary.busy.cancel-on-busy:focus-visible .processing-label {
		display: none;
	}

	.button-primary.busy.cancel-on-busy:hover .cancel-label,
	.button-primary.busy.cancel-on-busy:focus-visible .cancel-label {
		display: inline;
	}

	.button-icon {
		border: 2px solid var(--btn-edge);
		background: var(--btn-bg);
		color: var(--btn-fg);
		box-shadow: 3px 3px 0 var(--btn-shadow);
		cursor: pointer;
		transition:
			opacity 150ms linear,
			background-color 120ms linear;
	}

	.button-icon:hover {
		background: color-mix(in srgb, var(--btn-bg) 85%, white);
	}

	.button-icon:active {
		background: color-mix(in srgb, var(--btn-bg) 75%, black);
	}

	@media (hover: hover) and (pointer: fine) {
		.button-icon.revealable {
			opacity: 0;
			pointer-events: none;
		}

		:global(.reveal-on-hover:hover) .button-icon.revealable {
			opacity: 1;
			pointer-events: auto;
		}
	}

	.button-icon.revealable:focus-visible {
		opacity: 1;
		pointer-events: auto;
	}

	@keyframes fill-sweep {
		to {
			background-position: 16px 0;
		}
	}
</style>
