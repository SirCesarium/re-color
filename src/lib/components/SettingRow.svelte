<script lang="ts">
	import type { Snippet } from 'svelte';
	import Typography from '#lib/components/Typography.svelte';

	let {
		title,
		hint,
		control,
		stacked = false,
		divider = true
	}: {
		title: string;
		hint: string;
		control: Snippet;
		stacked?: boolean;
		divider?: boolean;
	} = $props();
</script>

<div
	class="grid gap-3 py-3.5 {divider
		? 'border-t border-border first:border-t-0 first:pt-0'
		: ''} {stacked
		? ''
		: 'min-[640px]:grid-cols-[minmax(0,1fr)_auto] min-[640px]:items-center'}"
>
	<div class="grid min-w-0 gap-1">
		<Typography as="span" variant="control-label">{title}</Typography>
		<Typography as="span" variant="control-hint">{hint}</Typography>
	</div>
	<div class="min-w-0 {stacked ? '' : 'min-[640px]:justify-self-end'}">
		{@render control()}
	</div>
</div>
