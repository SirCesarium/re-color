<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import SiteFooter from '#lib/components/SiteFooter.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

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
