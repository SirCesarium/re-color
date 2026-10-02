<script lang="ts">
	import Hint from '#lib/components/Hint.svelte';

	let {
		disabled = false,
		busy = false,
		progress = 0,
		hint = null,
		onclick
	}: {
		disabled?: boolean;
		busy?: boolean;
		progress?: number;
		hint?: string | null;
		onclick?: () => void;
	} = $props();

	let fill = $derived(busy ? Math.round(progress * 100) : 0);
</script>

<div class="run-block">
	<button class="run" class:busy type="button" disabled={disabled || busy} aria-busy={busy} {onclick}>
		<span class="fill" style:width="{fill}%"></span>
		<span class="label">{busy ? 'processing...' : 'recolor!'}</span>
	</button>

	<Hint text={hint} />
</div>

<style>
	.run-block {
		display: flex;
		flex-direction: column;
		gap: 16px;
		width: 100%;
		max-width: 480px;
		animation: rise 380ms ease-out 160ms backwards;
	}

	.run {
		position: relative;
		overflow: hidden;
		font-family: inherit;
		font-size: 16px;
		font-weight: 700;
		width: 100%;
		padding: 12px 32px;
		color: var(--btn-fg);
		background: var(--btn-bg);
		border: 2px solid var(--btn-edge);
		box-shadow: 4px 4px 0 var(--btn-shadow);
		cursor: pointer;
		transition:
			transform 80ms ease-out,
			box-shadow 80ms ease-out,
			background-color 120ms linear;
	}

	.fill {
		position: absolute;
		inset: 0 auto 0 0;
		width: 0;
		background-color: color-mix(in srgb, var(--btn-fg) 22%, transparent);
		background-image: repeating-linear-gradient(
			90deg,
			color-mix(in srgb, var(--btn-fg) 55%, transparent) 0 8px,
			transparent 8px 16px
		);
		transition: width 120ms linear;
	}

	.run.busy .fill {
		animation: fill-sweep 600ms linear infinite;
	}

	@keyframes fill-sweep {
		to {
			background-position: 16px 0;
		}
	}

	.label {
		position: relative;
		z-index: 1;
	}

	.run:hover {
		background: color-mix(in srgb, var(--btn-bg) 85%, white);
		transform: translateY(-2px);
		box-shadow: 6px 6px 0 var(--btn-shadow);
	}

	.run:active {
		transform: translate(4px, 4px);
		box-shadow: 0 0 0 var(--btn-shadow);
	}

	.run:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}

	.run:disabled {
		color: var(--text-dim);
		background: var(--panel-sunken);
		border-color: var(--border);
		box-shadow: 4px 4px 0 var(--border);
		cursor: not-allowed;
	}

	.run:disabled:hover {
		background: var(--panel-sunken);
		transform: none;
		box-shadow: 4px 4px 0 var(--border);
	}

	.run:disabled:active {
		transform: none;
		box-shadow: 4px 4px 0 var(--border);
	}

	.run.busy {
		color: var(--btn-fg);
		background: var(--btn-bg);
		border-color: var(--btn-edge);
		box-shadow: 4px 4px 0 var(--btn-shadow);
		cursor: progress;
	}

	.run.busy:hover {
		background: var(--btn-bg);
		transform: none;
		box-shadow: 4px 4px 0 var(--btn-shadow);
	}

	.run.busy:active {
		transform: none;
		box-shadow: 4px 4px 0 var(--btn-shadow);
	}

	@media (min-width: 900px) {
		.run-block {
			grid-column: 1;
			justify-self: stretch;
		}
	}
</style>
