<script lang="ts">
	let {
		checked,
		label,
		onchange
	}: {
		checked: boolean;
		label: string;
		onchange: (checked: boolean) => void;
	} = $props();
</script>

<button
	class="flex-none cursor-pointer border-0 bg-transparent p-0"
	type="button"
	role="switch"
	aria-checked={checked}
	aria-label={label}
	onclick={() => onchange(!checked)}
>
	<span
		class="flex h-6.5 w-12 items-center border-2 border-btn-edge p-0.75 shadow-[2px_2px_0_var(--btn-shadow)] transition-colors duration-150 {checked
			? 'bg-(--sw-green)'
			: 'bg-panel-sunken'}"
	>
		<span
			class="h-4 w-4 border-2 border-btn-edge transition-transform duration-150 {checked
				? 'translate-x-5 bg-btn-fg'
				: 'bg-text-dim'}"
		></span>
	</span>
</button>
