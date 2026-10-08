<script module>
	let instanceCount = 0;
</script>

<script lang="ts" generics="T extends string">
	import { tick } from 'svelte';

	let {
		options,
		value = $bindable<T>(),
		label,
		onchange,
		class: className = ''
	}: {
		options: readonly { value: T; label: string }[];
		value?: T;
		label: string;
		onchange?: (value: T) => void;
		class?: string;
	} = $props();

	const listId = `dropdown-list-${++instanceCount}`;

	let open = $state(false);
	let active = $state(0);
	let root = $state<HTMLDivElement | undefined>(undefined);
	let trigger = $state<HTMLButtonElement | undefined>(undefined);
	let list = $state<HTMLDivElement | undefined>(undefined);

	const selectedIndex = $derived(
		Math.max(0, options.findIndex((option) => option.value === value))
	);
	const selected = $derived(options[selectedIndex]);
	const activeId = $derived(`${listId}-option-${active}`);

	function optionClass(index: number) {
		if (index === selectedIndex) return 'bg-btn-bg text-btn-fg';
		if (index === active) return 'bg-panel-hover text-text';
		return 'text-text-dim hover:bg-panel-hover hover:text-text';
	}

	async function show() {
		if (open) return;
		active = selectedIndex;
		open = true;
		await tick();
		list?.focus();
	}

	function hide(restoreFocus = true) {
		if (!open) return;
		open = false;
		if (restoreFocus) trigger?.focus();
	}

	function choose(index: number) {
		const option = options[index];
		if (!option) return;
		value = option.value;
		onchange?.(option.value);
		hide();
	}

	function onTriggerKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			void show();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			hide();
		}
	}

	function onListKeydown(event: KeyboardEvent) {
		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				active = Math.min(active + 1, options.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				active = Math.max(active - 1, 0);
				break;
			case 'Home':
				event.preventDefault();
				active = 0;
				break;
			case 'End':
				event.preventDefault();
				active = options.length - 1;
				break;
			case 'Enter':
			case ' ':
				event.preventDefault();
				choose(active);
				break;
			case 'Escape':
				event.preventDefault();
				hide();
				break;
			case 'Tab':
				hide(false);
				break;
		}
	}

	$effect(() => {
		if (!open) return;

		function onPointerDown(event: PointerEvent) {
			if (root && !root.contains(event.target as Node)) hide(false);
		}

		window.addEventListener('pointerdown', onPointerDown, true);
		return () => window.removeEventListener('pointerdown', onPointerDown, true);
	});
</script>

<div class="relative block min-w-40 {className}" bind:this={root}>
	<button
		bind:this={trigger}
		class="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2.5 border-2 border-btn-edge bg-panel px-3 py-2.5 text-left text-base leading-[1.2] text-text shadow-[4px_4px_0_var(--btn-shadow)] transition-colors duration-150 hover:bg-panel-hover"
		type="button"
		aria-label={label}
		aria-haspopup="listbox"
		aria-expanded={open}
		aria-controls={listId}
		onclick={() => (open ? hide() : show())}
		onkeydown={onTriggerKeydown}
	>
		<span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
			>{selected?.label ?? ''}</span
		>
		<span
			class="size-0 shrink-0 border-x-[5px] border-x-transparent border-t-[6px] transition-transform duration-150 {open
				? 'rotate-180 border-t-text'
				: 'border-t-text-dim'}"
			aria-hidden="true"
		></span>
	</button>

	{#if open}
		<div
			bind:this={list}
			id={listId}
			class="absolute left-0 top-full z-30 mt-1 grid max-h-[260px] w-max min-w-full overflow-y-auto border-2 border-btn-edge bg-panel shadow-[4px_4px_0_var(--btn-shadow)]"
			role="listbox"
			aria-label={label}
			aria-activedescendant={activeId}
			tabindex="-1"
			onkeydown={onListKeydown}
		>
			{#each options as option, index (option.value)}
				<button
					id="{listId}-option-{index}"
					class="cursor-pointer px-3 py-[11px] text-left text-base leading-[1.2] whitespace-nowrap transition-colors duration-150 {optionClass(
						index
					)}"
					type="button"
					tabindex="-1"
					role="option"
					aria-selected={index === selectedIndex}
					onpointerenter={() => (active = index)}
					onclick={() => choose(index)}
				>
					{option.label}
				</button>
			{/each}
		</div>
	{/if}
</div>
