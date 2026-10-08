<script lang="ts">
	import { onMount } from 'svelte';
	import Hint from '#lib/components/Hint.svelte';
	import { t } from 'svelte-i18n';
	import { cssRgb, type PaletteColor } from '#lib';

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

		const active = !color.active;
		colors[index] = { ...color, active };
		if (!active) dismiss();
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

<div
	class="wrap relative mt-4 flex w-full justify-center"
	role="presentation"
	bind:this={root}
	onpointermove={onPointerMove}
>
	{#if colors.length > 0}
		<div class="flex flex-wrap justify-center gap-1">
			{#each colors as color, index (index)}
				<button
					class="sw relative h-4 w-4 cursor-pointer border border-border bg-[var(--c)] p-0 hover:shadow-[0_0_0_2px_var(--accent)]"
					class:off={!color.active}
					style:--c={cssRgb(color)}
					type="button"
					aria-pressed={color.active}
					aria-label={color.active ? $t('palette.disable') : $t('palette.enable')}
					onclick={() => toggle(index)}
				></button>
			{/each}
		</div>

		<Hint placement="above" text={hintVisible ? $t('palette.toggleHint') : null} />
	{:else}
		<div class="flex flex-wrap justify-center gap-1" aria-hidden="true">
			{#each PLACEHOLDER as key (key)}
				<span class="sw sw-{key} relative h-4 w-4 border border-border p-0"></span>
			{/each}
		</div>
	{/if}
</div>

<style>
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

	.sw {
		transition:
			box-shadow 100ms ease-out,
			opacity 200ms ease-out;
	}

	span.sw {
		cursor: default;
	}

	span.sw:hover {
		box-shadow: none;
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
