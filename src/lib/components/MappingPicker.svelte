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

<section
	class="animate-[rise_380ms_ease-out_200ms_backwards] flex w-full max-w-[480px] flex-col gap-2"
	aria-label="Color mapping"
>
	<span class="text-base text-ok">Mapping</span>

	<div
		class="relative grid grid-cols-3 overflow-hidden border-2 border-btn-edge bg-panel shadow-[4px_4px_0_var(--btn-shadow)] max-[420px]:grid-cols-1"
	>
		<span class="pill" style:--i={index}></span>

		{#each OPTIONS as option (option.id)}
			<button
				class="seg relative z-[1] flex min-w-0 items-center justify-center gap-1.5 border-0 border-l-2 border-solid border-btn-edge bg-transparent px-1 py-3 text-text-dim transition-[background-color,color] duration-[120ms] ease-linear first-of-type:border-l-0 hover:bg-panel-hover hover:text-text focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-accent max-[420px]:border-l-0 max-[420px]:border-t-2 max-[420px]:px-2 max-[420px]:py-3 max-[420px]:first-of-type:border-t-0"
				class:on={mapping === option.id}
				type="button"
				aria-pressed={mapping === option.id}
				title={option.label}
				onclick={() => (mapping = option.id)}
			>
				<span
					class="label min-w-0 text-center text-base leading-[1.2] [overflow-wrap:break-word] transition-transform duration-[120ms] ease-out"
					>{option.label}</span
				>
			</button>
		{/each}
	</div>
</section>

<style>
	.pill {
		position: absolute;
		top: 0;
		bottom: 0;
		left: calc(var(--i, 0) * 100% / 3);
		width: calc(100% / 3);
		background: var(--btn-bg);
		transition:
			left 320ms cubic-bezier(0.34, 1.56, 0.64, 1),
			top 320ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.seg.on {
		color: var(--btn-fg);
	}

	.seg.on:hover {
		background: transparent;
		color: var(--btn-fg);
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

	@media (max-width: 420px) {
		.pill {
			left: 0;
			right: 0;
			width: auto;
			bottom: auto;
			top: calc(var(--i, 0) * 100% / 3);
			height: calc(100% / 3);
		}

	}
</style>
