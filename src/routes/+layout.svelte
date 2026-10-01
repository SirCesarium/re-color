<script lang="ts">
	import '../app.css';
	import SiteFooter from '#lib/components/SiteFooter.svelte';

	let { children } = $props();
</script>

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
