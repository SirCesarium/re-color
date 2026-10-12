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
		class="flex h-[26px] w-12 items-center border-2 border-btn-edge bg-panel-sunken p-[3px] shadow-[2px_2px_0_var(--btn-shadow)] transition-colors duration-150"
		style:background-color={checked ? 'var(--sw-green)' : 'var(--panel-sunken)'}
	>
		<span
			class="h-4 w-4 border-2 border-btn-edge bg-text-dim transition-transform duration-150"
			class:translate-x-5={checked}
			style:background-color={checked ? 'var(--btn-fg)' : 'var(--text-dim)'}
		></span>
	</span>
</button>
