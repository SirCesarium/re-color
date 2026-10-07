<script lang="ts">
	import '../app.css';
	import SiteFooter from '#lib/widgets/SiteFooter.svelte';

	let { children } = $props();

	const swallowFile = (event: DragEvent) => event.preventDefault();
</script>

<svelte:window ondragover={swallowFile} ondrop={swallowFile} />

<div class="flex min-h-svh flex-col items-center font-pixel">
	{@render children()}

	<SiteFooter />
</div>
