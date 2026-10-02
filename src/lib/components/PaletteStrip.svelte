<script lang="ts">
	import { onMount } from 'svelte';
	import Hint from '#lib/components/Hint.svelte';
	import { cssRgb, type PaletteColor } from '#lib/color.ts';

	let { colors = $bindable([]) }: { colors: PaletteColor[] } = $props();

	let hintVisible = $state(false);
	let hintAllowed = $state(false);
	let hintConsumed = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let root = $state<HTMLDivElement | null>(null);

	const HINT_KEY = 'recolor.hintSeen';
	const MAX_HINTS = 2;
	const HINT_LIFETIME = 4000;

	const PLACEHOLDER = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple'];

	onMount(() => {
		const seen = Number(localStorage.getItem(HINT_KEY) ?? 0);
		hintAllowed = seen < MAX_HINTS;
	});

	$effect(() => {
		if (colors.length === 0 || hintConsumed || !hintAllowed) return;

		hintConsumed = true;

		const seen = Number(localStorage.getItem(HINT_KEY) ?? 0);
		localStorage.setItem(HINT_KEY, String(seen + 1));

		hintVisible = true;
		timer = setTimeout(dismiss, HINT_LIFETIME);

		return () => clearTimeout(timer);
	});

	function dismiss() {
		hintVisible = false;
		clearTimeout(timer);
	}

	function toggle(index: number) {
		const color = colors[index];
		if (!color) return;

		colors[index] = { ...color, active: !color.active };
		if (!color.active) dismiss();
	}

	function onPointerMove(event: PointerEvent) {
		if (!hintVisible || !root) return;

		const box = root.getBoundingClientRect();
		const reach = 120;

		const inside =
			event.clientX >= box.left - reach &&
			event.clientX <= box.right + reach &&
			event.clientY >= box.top - reach &&
			event.clientY <= box.bottom + reach;

		if (inside) dismiss();
	}
</script>

<div class="wrap" role="presentation" bind:this={root} onpointermove={onPointerMove}>
	{#if colors.length > 0}
		<div class="palette">
			{#each colors as color, index (index)}
				<button
					class="sw"
					class:off={!color.active}
					style:--c={cssRgb(color)}
					type="button"
					aria-pressed={color.active}
					aria-label={color.active ? 'Disable color' : 'Enable color'}
					onclick={() => toggle(index)}
				></button>
			{/each}
		</div>

		<Hint placement="above" text={hintVisible ? 'Click to enable/disable' : null} />
	{:else}
		<div class="palette" aria-hidden="true">
			{#each PLACEHOLDER as key (key)}
				<span class="sw sw-{key}"></span>
			{/each}
		</div>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
		display: inline-flex;
		justify-content: center;
		margin-top: 16px;
		max-width: 100%;
	}

	.palette {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 4px;
	}

	.sw {
		position: relative;
		width: 16px;
		height: 16px;
		padding: 0;
		border: 1px solid var(--border);
		background: var(--c);
		cursor: pointer;
		transition:
			box-shadow 100ms ease-out,
			opacity 200ms ease-out;
	}

	.sw-red {
		background: var(--sw-red);
	}
	.sw-orange {
		background: var(--sw-orange);
	}
	.sw-yellow {
		background: var(--sw-yellow);
	}
	.sw-green {
		background: var(--sw-green);
	}
	.sw-aqua {
		background: var(--sw-aqua);
	}
	.sw-blue {
		background: var(--sw-blue);
	}
	.sw-purple {
		background: var(--sw-purple);
	}

	span.sw {
		cursor: default;
	}

	span.sw:hover {
		box-shadow: none;
	}

	.sw:hover {
		box-shadow: 0 0 0 2px var(--accent);
	}

	.sw:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.sw.off {
		background: color-mix(in srgb, var(--text-dim) 65%, var(--c));
	}

	.sw.off::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 1;
		background: linear-gradient(
			to top right,
			transparent calc(50% - 1px),
			var(--pop) calc(50% - 1px),
			var(--pop) calc(50% + 1px),
			transparent calc(50% + 1px)
		);
	}
</style>
