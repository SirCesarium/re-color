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

<div
	class="animate-[rise_380ms_ease-out_160ms_backwards] flex w-full max-w-[480px] flex-col gap-4 min-[900px]:col-start-1 min-[900px]:justify-self-stretch"
>
	<button
		class="run relative w-full cursor-pointer overflow-hidden border-2 border-btn-edge bg-btn-bg px-8 py-3 text-base font-bold text-btn-fg shadow-[4px_4px_0_var(--btn-shadow)] transition-[transform,box-shadow,background-color] duration-[80ms] ease-out"
		class:busy
		type="button"
		disabled={disabled || busy}
		aria-busy={busy}
		{onclick}
	>
		<span class="fill absolute inset-y-0 left-0 bg-[color-mix(in_srgb,var(--btn-fg)_22%,transparent)]" style:width="{fill}%"></span>
		<span class="label relative z-[1]">{busy ? 'processing...' : 'recolor!'}</span>
	</button>

	<Hint text={hint} />
</div>

<style>
	.fill {
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
</style>
