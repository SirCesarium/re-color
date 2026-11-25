<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Hint from '#app/components/Hint.svelte';
	import { hintsEnabled } from '#app/state/hints.ts';
	import { t } from '#app/text/index.ts';
	import { cssRgb, type PaletteColor, type Rgb } from '#lib';

	let {
		colors = $bindable([]),
		onColorsChange,
		class: className = ''
	}: {
		colors: PaletteColor[];
		onColorsChange?: (previous: PaletteColor[]) => void;
		class?: string;
	} = $props();

	let hintVisible = $state(false);
	let hintAllowed = $state(false);
	let hintConsumed = false;

	let adding = $state(false);
	let hexInput = $state('#458588');

	let hoverCapable = $state(false);
	let expanded = $state(false);
	let expandedMax = $state(0);
	let scrollable = $state(false);
	let overflowing = $state(false);
	let slotHeight = $state<number | null>(null);

	let panelEl = $state<HTMLDivElement>();
	let swatchEl = $state<HTMLDivElement>();

	const HINT_KEY = 'recolor.hintSeen';
	const MAX_HINTS = 2;

	const PLACEHOLDER = ['red', 'orange', 'yellow', 'green', 'aqua', 'blue', 'purple'];

	const activeCount = $derived(colors.filter((color) => color.active).length);
	const parsedAddColor = $derived(parseHex(hexInput));
	const pickerHex = $derived(parsedAddColor ? toHex(parsedAddColor) : '#458588');

	onMount(() => {
		const seen = Number(localStorage.getItem(HINT_KEY) ?? 0);
		hintAllowed = seen < MAX_HINTS;

		const query =
			typeof window.matchMedia === 'function'
				? window.matchMedia('(hover: hover) and (pointer: fine)')
				: null;

		if (!query) return;

		const sync = () => {
			hoverCapable = query.matches;
		};

		const onResize = () => {
			void tick().then(measure);
		};

		sync();
		query.addEventListener('change', sync);
		window.addEventListener('resize', onResize);
		void tick().then(measure);

		return () => {
			query.removeEventListener('change', sync);
			window.removeEventListener('resize', onResize);
		};
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
	});

	$effect(() => {
		scheduleMeasure(colors.length, adding, hoverCapable, hintVisible);
	});

	function scheduleMeasure(
		_count: number,
		_adding: boolean,
		_hoverCapable: boolean,
		_hintVisible: boolean
	) {
		void tick().then(measure);
	}

	function measure() {
		if (!hoverCapable || expanded || !panelEl || !swatchEl) {
			if (!hoverCapable) {
				slotHeight = null;
				overflowing = false;
			}
			return;
		}

		slotHeight = panelEl.offsetHeight;
		overflowing = swatchEl.scrollHeight > swatchEl.clientHeight + 1;
	}

	function expand() {
		if (!hoverCapable || expanded || !swatchEl) return;

		const cap = Math.round(window.innerHeight * 0.55);
		expandedMax = Math.min(swatchEl.scrollHeight, cap);
		scrollable = false;
		expanded = true;
	}

	function collapse() {
		expanded = false;
		scrollable = false;
	}

	function onSwatchTransitionEnd(event: TransitionEvent) {
		if (event.propertyName !== 'max-height') return;

		if (expanded) {
			scrollable = true;
			return;
		}

		void tick().then(measure);
	}

	function onFocusOut(event: FocusEvent) {
		if (panelEl?.contains(event.relatedTarget as Node | null)) return;
		collapse();
	}

	function toHex(color: Rgb): string {
		const channel = (value: number) => value.toString(16).padStart(2, '0');
		return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
	}

	function parseHex(raw: string): Rgb | null {
		const cleaned = raw.trim().replace(/^#/, '');
		if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
			const [r, g, b] = cleaned.split('').map((ch) => parseInt(ch + ch, 16));
			return { r, g, b };
		}
		if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
			return {
				r: parseInt(cleaned.slice(0, 2), 16),
				g: parseInt(cleaned.slice(2, 4), 16),
				b: parseInt(cleaned.slice(4, 6), 16)
			};
		}
		return null;
	}

	function dismiss() {
		hintVisible = false;
	}

	function commitColors(next: PaletteColor[]) {
		const previous = colors;
		colors = next;
		onColorsChange?.(previous);
	}

	function toggleOrRemove(index: number) {
		const color = colors[index];
		if (!color) return;

		if (color.custom) {
			commitColors(colors.filter((_, i) => i !== index));
			return;
		}

		const active = !color.active;
		commitColors(colors.map((item, i) => (i === index ? { ...item, active } : item)));
	}

	function enableAll() {
		if (!colors.some((color) => !color.active)) return;
		commitColors(colors.map((color) => (color.active ? color : { ...color, active: true })));
	}

	function openAdd() {
		adding = true;
	}

	function closeAdd() {
		adding = false;
	}

	function confirmAdd() {
		const rgb = parsedAddColor;
		if (!rgb) return;

		const existingIndex = colors.findIndex(
			(candidate) => candidate.r === rgb.r && candidate.g === rgb.g && candidate.b === rgb.b
		);

		if (existingIndex >= 0) {
			const existing = colors[existingIndex];
			if (existing && !existing.active) {
				commitColors(
					colors.map((item, i) => (i === existingIndex ? { ...item, active: true } : item))
				);
			}
		} else {
			commitColors([...colors, { ...rgb, active: true, custom: true }]);
		}

		adding = false;
	}

	function onHexKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			confirmAdd();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			closeAdd();
		}
	}
</script>

<div
	class="relative mt-4 flex w-full {colors.length > 0
		? 'justify-start text-left'
		: 'justify-center'} {className}"
	role="presentation"
>
	{#if colors.length > 0}
		<div
			class="relative mx-auto w-full max-w-120 animate-[rise_220ms_ease-out_backwards] min-[900px]:mx-0"
			style:height={slotHeight ? `${slotHeight}px` : undefined}
		>
			<div
				bind:this={panelEl}
				class="flex flex-col border-2 border-btn-edge bg-panel transition-[box-shadow] duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)] {expanded
					? 'absolute inset-x-0 top-0 z-20 shadow-[6px_6px_0_var(--btn-shadow)]'
					: 'relative shadow-[3px_3px_0_var(--btn-shadow)]'}"
				role="group"
				aria-label={t('palette.section')}
				onmouseenter={expand}
				onmouseleave={collapse}
				onfocusin={expand}
				onfocusout={onFocusOut}
			>
				<div
					class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border px-3 py-1.5"
				>
					<div class="flex items-baseline gap-2">
						<span class="text-sm text-ok">{t('palette.section')}</span>
						<span
							class="text-xs {activeCount === 0 ? 'text-pop' : 'text-text'}"
							data-testid="palette-count"
						>
							{t('palette.count', { active: String(activeCount), total: String(colors.length) })}
						</span>
					</div>
					{#if activeCount < colors.length}
						<button
							type="button"
							class="cursor-pointer border-0 bg-transparent p-0 text-[11px] text-text-dim underline decoration-dotted underline-offset-4 hover:text-text"
							onclick={enableAll}
						>
							{t('palette.enableAll')}
						</button>
					{/if}
				</div>

				{#if hintVisible}
					<div class="border-b border-border bg-panel-sunken">
						<Hint
							placement="flow"
							arrow="none"
							class="w-full border-0! bg-transparent! px-3! py-2! text-left text-[11px] leading-[1.4] text-text-dim shadow-none!"
							hintsEnabled={$hintsEnabled}
							text={t('palette.toggleHint')}
							onDismiss={dismiss}
						/>
					</div>
				{/if}

				<div
					bind:this={swatchEl}
					class="flex flex-wrap items-center justify-start gap-2 p-3 transition-[max-height] duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)] {expanded
						? scrollable
							? 'fine-pointer:overflow-y-auto'
							: 'fine-pointer:overflow-hidden'
						: 'fine-pointer:max-h-28 fine-pointer:overflow-hidden'}"
					style:max-height={expanded ? `${expandedMax}px` : undefined}
					ontransitionend={onSwatchTransitionEnd}
				>
					{#each colors as color, index (index)}
						{@const hex = toHex(color)}
						{#if color.custom}
							<button
								class="relative h-10 w-10 animate-[pop_160ms_ease-out] cursor-pointer border-2 border-accent bg-(--c) p-0 shadow-[2px_2px_0_var(--btn-shadow)] [transition:transform_80ms_ease-out,box-shadow_100ms_ease-out,border-color_100ms_ease-out] hover:-translate-y-0.5 hover:border-(--pop) hover:shadow-[3px_3px_0_var(--btn-shadow)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-0 active:shadow-none"
								style:--c={cssRgb(color)}
								type="button"
								data-custom="true"
								aria-label={`${t('palette.remove')} ${hex}`}
								title={`${hex} — ${t('palette.customTitle')}`}
								onclick={() => toggleOrRemove(index)}
							>
								<span
									aria-hidden="true"
									class="pointer-events-none absolute top-1 right-1 h-1.5 w-1.5 bg-panel shadow-[0_0_0_1px_var(--btn-edge)]"
								></span>
							</button>
						{:else}
							<button
								class="relative h-10 w-10 cursor-pointer p-0 [transition:transform_80ms_ease-out,box-shadow_100ms_ease-out,border-color_100ms_ease-out,opacity_150ms_ease-out] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent {color.active
									? 'border-2 border-btn-edge bg-(--c) shadow-[2px_2px_0_var(--btn-shadow)] hover:-translate-y-0.5 hover:border-accent hover:shadow-[3px_3px_0_var(--btn-shadow)] active:translate-y-0 active:shadow-none'
									: "border-2 border-dashed border-border-dash bg-[color-mix(in_srgb,var(--panel-sunken)_55%,var(--c))] opacity-65 after:absolute after:inset-0 after:z-1 after:bg-[linear-gradient(to_top_right,transparent_calc(50%-1.5px),var(--pop)_calc(50%-1.5px),var(--pop)_calc(50%+1.5px),transparent_calc(50%+1.5px))] after:content-[''] hover:opacity-95"}"
								style:--c={cssRgb(color)}
								type="button"
								aria-pressed={color.active}
								aria-label={`${color.active ? t('palette.disable') : t('palette.enable')} ${hex}`}
								title={`${hex} — ${color.active ? t('palette.disable') : t('palette.enable')}`}
								onclick={() => toggleOrRemove(index)}
							></button>
						{/if}
					{/each}

					<button
						type="button"
						class="flex h-10 w-10 cursor-pointer items-center justify-center border-2 border-dashed border-btn-edge bg-panel-sunken p-0 text-text-dim transition-colors hover:border-accent hover:bg-panel-hover hover:text-text"
						aria-label={t('palette.add')}
						aria-expanded={adding}
						title={t('palette.add')}
						onclick={() => (adding ? closeAdd() : openAdd())}
					>
						<svg
							aria-hidden="true"
							viewBox="0 0 12 12"
							class="h-3.5 w-3.5 fill-current"
							shape-rendering="crispEdges"
						>
							<rect x="5" y="1" width="2" height="10" />
							<rect x="1" y="5" width="10" height="2" />
						</svg>
					</button>
				</div>

				{#if adding}
					<div
						class="flex animate-[hint-in_150ms_ease-out] flex-wrap items-center justify-start gap-2 border-t border-border px-3 py-3"
					>
						<input
							type="color"
							class="h-9 w-9 shrink-0 cursor-pointer border-2 border-btn-edge bg-transparent p-0"
							aria-label={t('palette.addPickerAria')}
							value={pickerHex}
							oninput={(event) => {
								hexInput = event.currentTarget.value;
							}}
						/>
						<input
							type="text"
							class="h-9 min-w-28 flex-1 border-2 border-btn-edge bg-panel-sunken px-2.5 font-pixel text-sm text-text focus:border-accent focus:outline-none"
							placeholder="#RRGGBB"
							maxlength={7}
							aria-label={t('palette.addHexAria')}
							bind:value={hexInput}
							onkeydown={onHexKeyDown}
						/>
						<button
							type="button"
							disabled={!parsedAddColor}
							class="h-9 cursor-pointer border-2 border-btn-edge bg-btn-bg px-3 text-xs font-bold text-btn-fg shadow-[2px_2px_0_var(--btn-shadow)] transition-colors hover:bg-[color-mix(in_srgb,var(--btn-bg)_85%,white)] disabled:cursor-not-allowed disabled:border-border disabled:bg-panel-sunken disabled:text-text-dim disabled:shadow-none"
							onclick={confirmAdd}
						>
							{t('palette.addConfirm')}
						</button>
						<button
							type="button"
							class="flex h-9 w-9 cursor-pointer items-center justify-center border-2 border-border bg-panel-sunken text-lg font-bold text-pop hover:border-btn-edge"
							aria-label={t('palette.addCancel')}
							onclick={closeAdd}
						>
							&times;
						</button>
					</div>
				{/if}

				{#if overflowing && !expanded}
					<div
						aria-hidden="true"
						class="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-panel to-transparent"
					></div>
				{/if}
			</div>
		</div>
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
