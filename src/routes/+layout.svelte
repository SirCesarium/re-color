<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import SiteFooter from '#lib/widgets/SiteFooter.svelte';

	let { children } = $props();

	const swallowFile = (event: DragEvent) => event.preventDefault();

	onMount(() => {
		if (!('serviceWorker' in navigator)) return;

		void navigator.serviceWorker.ready
			.then((registration) => registration.update())
			.catch((error: unknown) => {
				console.warn('Could not check for app updates', error);
			});
	});
</script>

<svelte:window ondragover={swallowFile} ondrop={swallowFile} />

<div class="flex min-h-svh flex-col items-center font-pixel">
	{@render children()}

	<SiteFooter />
</div>
