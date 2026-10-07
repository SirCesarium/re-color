<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import SiteFooter from '#lib/widgets/SiteFooter.svelte';

	let { children } = $props();

	const swallowFile = (event: DragEvent) => event.preventDefault();

	onMount(() => {
		if (!('serviceWorker' in navigator)) return;

		let disposed = false;
		let registration: ServiceWorkerRegistration | undefined;
		let updateInterval: ReturnType<typeof setInterval> | undefined;

		const checkForUpdate = () => {
			if (document.visibilityState !== 'visible') return;

			void registration?.update().catch((error: unknown) => {
				console.warn('Could not check for app updates', error);
			});
		};

		document.addEventListener('visibilitychange', checkForUpdate);
		window.addEventListener('online', checkForUpdate);

		void navigator.serviceWorker.ready.then((readyRegistration) => {
			if (disposed) return;

			registration = readyRegistration;
			checkForUpdate();
			updateInterval = setInterval(checkForUpdate, 60 * 60 * 1000);
		});

		return () => {
			disposed = true;
			document.removeEventListener('visibilitychange', checkForUpdate);
			window.removeEventListener('online', checkForUpdate);
			clearInterval(updateInterval);
		};
	});
</script>

<svelte:window ondragover={swallowFile} ondrop={swallowFile} />

<div class="flex min-h-svh flex-col items-center font-pixel">
	{@render children()}

	<SiteFooter />
</div>
