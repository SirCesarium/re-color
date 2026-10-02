<script lang="ts">
	import { onMount } from 'svelte';
	import type { MappingMode } from '#lib/color.ts';

	let { mapping = $bindable('luminance') }: { mapping?: MappingMode } = $props();

	const STORAGE_KEY = 'recolor.mapping';
	const OPTIONS: { id: MappingMode; label: string }[] = [
		{ id: 'nearest', label: 'Nearest color' },
		{ id: 'luminance', label: 'Luminance order' },
		{ id: 'dominant', label: 'Dominant color' }
	];

	let loaded = $state(false);
	let index = $derived(OPTIONS.findIndex((option) => option.id === mapping));

	onMount(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		const option = OPTIONS.find((option) => option.id === stored);
		if (option) mapping = option.id;

		loaded = true;
	});

	$effect(() => {
		if (!loaded) return;
		localStorage.setItem(STORAGE_KEY, mapping);
	});
</script>

<section class="map-wrap" aria-label="Color mapping">
	<span class="map-title">Mapping</span>

	<div class="group">
		<span class="pill" style:left="{index * (100 / OPTIONS.length)}%"></span>

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
		position: relative;
		overflow: hidden;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		background: var(--panel);
		border: 2px solid var(--btn-edge);
		box-shadow: 4px 4px 0 var(--btn-shadow);
	}

	.pill {
		position: absolute;
		top: 0;
		bottom: 0;
		width: calc(100% / 3);
		background: var(--btn-bg);
		transition: left 320ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.seg {
		position: relative;
		z-index: 1;
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

	.seg:first-child {
		border-left: 0;
	}

	.seg:hover {
		background: var(--panel-hover);
		color: var(--text);
	}

	.seg.on {
		color: var(--btn-fg);
	}

	.seg.on:hover {
		background: transparent;
		color: var(--btn-fg);
	}

	.seg:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -4px;
	}

	.label {
		font-size: 16px;
		line-height: 1;
		text-align: center;
		overflow-wrap: anywhere;
		transition: transform 120ms ease-out;
	}

	.seg.on .label {
		animation: pop 220ms ease-out;
	}

	.seg:active .label {
		transform: translateY(2px);
	}

	@keyframes pop {
		from {
			transform: scale(0.7);
		}
	}
</style>
