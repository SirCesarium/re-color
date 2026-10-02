<script lang="ts">
	import type { MappingMode } from '#lib/color.ts';

	let { mapping = $bindable('luminance') }: { mapping?: MappingMode } = $props();

	const OPTIONS: { id: MappingMode; label: string }[] = [
		{ id: 'nearest', label: 'Nearest color' },
		{ id: 'luminance', label: 'Luminance order' },
		{ id: 'dominant', label: 'Dominant color' }
	];
</script>

<section class="map-wrap" aria-label="Color mapping">
	<span class="map-title">Mapping</span>

	<div class="group">
		{#each OPTIONS as option (option.id)}
			<button
				class="seg"
				class:on={mapping === option.id}
				type="button"
				aria-pressed={mapping === option.id}
				title={option.label}
				onclick={() => (mapping = option.id)}
			>
				<span class="label">{option.label}</span>
			</button>
		{/each}
	</div>
</section>

<style>
	.map-wrap {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		max-width: 480px;
		animation: rise 380ms ease-out 200ms backwards;
	}

	.map-title {
		font-size: 16px;
		color: var(--ok);
	}

	.group {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		background: var(--panel);
		border: 2px solid var(--btn-edge);
		box-shadow: 4px 4px 0 var(--btn-shadow);
	}

	.seg {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-width: 0;
		padding: 12px 4px;
		background: transparent;
		border: 0;
		border-left: 2px solid var(--btn-edge);
		color: var(--text-dim);
		cursor: pointer;
		transition:
			background-color 120ms linear,
			color 120ms linear;
	}

	.label {
		font-size: 16px;
		line-height: 1;
		text-align: center;
		overflow-wrap: anywhere;
	}

	.seg:first-child {
		border-left: 0;
	}

	.seg:hover {
		background: var(--panel-hover);
		color: var(--text);
	}

	.seg.on {
		background: var(--btn-bg);
		color: var(--btn-fg);
	}

	.seg.on:hover {
		background: var(--btn-bg);
		color: var(--btn-fg);
	}

	.seg:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -4px;
	}
</style>
