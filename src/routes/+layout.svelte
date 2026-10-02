<script lang="ts">
	import '../app.css';
	import SiteFooter from '#lib/components/SiteFooter.svelte';

	let { children } = $props();

	const swallowFile = (event: DragEvent) => event.preventDefault();
</script>

<svelte:window ondragover={swallowFile} ondrop={swallowFile} />

<div class="shell">
	{@render children()}

	<SiteFooter />
</div>

<style>
	.shell {
		min-height: 100svh;
		display: flex;
		flex-direction: column;
		align-items: center;
	}
</style>
