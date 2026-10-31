<script lang="ts" generics="T extends string">
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

	function segClasses(isOn: boolean): string {
		const base = [
			'group/seg relative z-1 flex min-w-0 items-center justify-center',
			'gap-1.5 px-1 py-3 border-0 border-l-2 border-l-btn-edge',
			'bg-transparent cursor-pointer',
			'[transition:background-color_120ms_linear,color_120ms_linear]',
			'first:border-l-0',
			'max-[420px]:border-l-0 max-[420px]:border-t-2 max-[420px]:border-t-btn-edge',
			'max-[420px]:px-2 max-[420px]:first:border-t-0',
			"before:content-[''] before:absolute before:inset-0 before:-z-1",
			'before:transition-colors before:duration-120 before:ease-linear'
		];
		if (isOn) {
			base.push('text-btn-fg before:bg-btn-bg');
		} else {
			base.push('text-text-dim hover:bg-panel-hover hover:text-text');
		}
		return base.join(' ');
	}
</script>

<div
	class="relative grid grid-cols-[repeat(var(--option-count),minmax(0,1fr))] overflow-hidden border-2 border-btn-edge bg-panel shadow-[4px_4px_0_var(--btn-shadow)] max-[420px]:grid-cols-1 {className}"
	role="group"
	aria-label={label}
	style:--option-count={options.length}
>
	{#each options as option (option.value)}
		<button
			class={segClasses(value === option.value)}
			type="button"
			aria-pressed={value === option.value}
			title={option.label}
			onclick={() => {
				value = option.value;
				onchange?.(option.value);
			}}
		>
			<span
				class="min-w-0 text-center text-base leading-[1.2] wrap-break-word transition-transform duration-120 ease-out group-active/seg:[text-shadow:1px_1px_0_var(--btn-shadow)] {value ===
				option.value
					? 'animate-[pop_220ms_ease-out]'
					: ''}">{option.label}</span
			>
		</button>
	{/each}
</div>
