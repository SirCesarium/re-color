<script lang="ts">
	let {
		label,
		hint,
		variant
	}: { label: string; hint: string; variant: 'ref' | 'base' } = $props();
</script>

<div class="drop drop-{variant}" role="button" tabindex="0">
	<span class="drop-label">{label}</span>
	<span class="drop-hint">{hint}</span>
</div>

<style>
	@keyframes ants {
		to {
			background-position: 16px 0, -16px 100%, 0 -16px, 100% 16px;
		}
	}

	.drop {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		aspect-ratio: 1;
		height: auto;
		padding: 0 12px;
		background-color: var(--panel);
		color: var(--border-dash);
		background-image:
			repeating-linear-gradient(90deg, currentColor 0 8px, transparent 8px 16px),
			repeating-linear-gradient(90deg, currentColor 0 8px, transparent 8px 16px),
			repeating-linear-gradient(180deg, currentColor 0 8px, transparent 8px 16px),
			repeating-linear-gradient(180deg, currentColor 0 8px, transparent 8px 16px);
		background-size: 16px 2px, 16px 2px, 2px 16px, 2px 16px;
		background-position: 0 0, 0 100%, 0 0, 100% 0;
		background-repeat: repeat-x, repeat-x, repeat-y, repeat-y;
		cursor: pointer;
		text-align: center;
		transition:
			color 120ms linear,
			background-color 120ms linear,
			transform 120ms ease-out;
	}

	.drop:hover {
		transform: translateY(-3px);
		animation: ants 500ms linear infinite;
	}

	.drop-ref:hover {
		color: var(--ref);
		background-color: var(--panel-hover);
	}

	.drop-base:hover {
		color: var(--base);
		background-color: var(--panel-hover);
	}

	.drop:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.drop-label {
		font-size: 16px;
	}

	.drop-ref .drop-label {
		color: var(--ref);
	}

	.drop-base .drop-label {
		color: var(--base);
	}

	.drop-hint {
		font-size: 16px;
		line-height: 1.5;
		color: var(--text-dim);
	}

	@media (max-width: 420px) {
		.drop {
			flex: none;
			width: 100%;
		}
	}
</style>
