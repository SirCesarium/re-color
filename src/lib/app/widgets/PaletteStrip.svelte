<script lang="ts">
	import { onMount } from 'svelte';
	import { t } from 'svelte-i18n';
	import Hint from '#app/components/Hint.svelte';
	import { hintsEnabled } from '#app/state/hints.ts';
	import { cssRgb, type PaletteColor } from '#lib';

	let {
		colors = $bindable([]),
		class: className = ''
	}: {
		colors: PaletteColor[];
		class?: string;
	} = $props();

	let hintVisible = $state(false);
	let hintAllowed = $state(false);
	let hintConsumed = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let root = $state<HTMLDivElement | null>(null);

	const HINT_KEY = 'recolor.hintSeen';
	const MAX_HINTS = 2;
	const HINT_LIFETIME = 4000;

	const PLACEHOLDER = [
		'red',
		'orange',
		'yellow',
		'green',
		'aqua',
		'blue',
		'purple'
	];

	onMount(() => {
		const seen = Number(localStorage.getItem(HINT_KEY) ?? 0);
		hintAllowed = seen < MAX_HINTS;
	});

	$effect(() => {
		if (colors.length === 0 || hintConsumed || !hintAllowed) return;

		// With the preference off the bubble never renders, so the budget it
		// would spend must stay untouched until hints are allowed again.
		if (!$hintsEnabled) return;

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
	class="wrap relative mt-4 flex w-full justify-center {className}"
	role="presentation"
	bind:this={root}
	onpointermove={onPointerMove}
>
	{#if colors.length > 0}
		<div class="flex flex-wrap justify-center gap-1">
			{#each colors as color, index (index)}
				<button
					class="relative h-4 w-4 cursor-pointer border border-border p-0 [transition:box-shadow_100ms_ease-out,opacity_200ms_ease-out] hover:shadow-[0_0_0_2px_var(--accent)] {!color.active ? 'bg-[color-mix(in_srgb,var(--text-dim)_65%,var(--c))] after:content-[\'\'] after:absolute after:inset-0 after:z-1 after:bg-[linear-gradient(to_top_right,transparent_calc(50%-1px),var(--pop)_calc(50%-1px),var(--pop)_calc(50%+1px),transparent_calc(50%+1px))]' : 'bg-(--c)'}"
					style:--c={cssRgb(color)}
					type="button"
					aria-pressed={color.active}
					aria-label={color.active
						? $t("palette.disable")
						: $t("palette.enable")}
					onclick={() => toggle(index)}
				></button>
			{/each}
		</div>

		<Hint
			placement="above"
			hintsEnabled={$hintsEnabled}
			text={hintVisible ? $t("palette.toggleHint") : null}
		/>
	{:else}
		<div class="flex flex-wrap justify-center gap-1" aria-hidden="true">
			{#each PLACEHOLDER as key (key)}
				<span
					class="relative h-4 w-4 cursor-default border border-border p-0"
					style:background-color="var(--sw-{key})"
				></span>
			{/each}
		</div>
	{/if}
</div>
