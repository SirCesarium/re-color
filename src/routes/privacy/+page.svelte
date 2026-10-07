<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Privacy: re::color</title>
	<meta
		name="description"
		content="re::color runs entirely on your device. Your images are never uploaded to any server, and the source code is free on GitHub."
	/>
	<link rel="canonical" href="https://recolor.pages.dev/privacy" />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="re::color" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:url" content="https://recolor.pages.dev/privacy" />
	<meta property="og:title" content="Privacy: re::color" />
	<meta
		property="og:description"
		content="Everything runs on your device. Your images never leave your browser."
	/>
	<meta property="og:image" content="https://recolor.pages.dev/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta
		property="og:image:alt"
		content="re::color wordmark above the tagline Recolor a sprite with any image's palette, over a row of seven palette colors."
	/>

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="Privacy: re::color" />
	<meta
		name="twitter:description"
		content="Everything runs on your device. Your images never leave your browser."
	/>
	<meta name="twitter:image" content="https://recolor.pages.dev/og.png" />
	<meta
		name="twitter:image:alt"
		content="re::color wordmark above the tagline Recolor a sprite with any image's palette, over a row of seven palette colors."
	/>
</svelte:head>

<main class="box-border flex w-full max-w-[560px] flex-1 flex-col items-center gap-6 px-4 py-12 text-center">
	<h1
		class="m-0 text-[32px] font-normal leading-none text-text [text-shadow:4px_4px_0_var(--shadow)]"
	>
		Privacy
	</h1>

	<p class="m-0 max-w-[44ch] text-base leading-6 text-text">
		Everything in re::color runs in your browser.
	</p>

	<p class="m-0 max-w-[44ch] text-base leading-6 text-text-dim">
		The images you drop are read and processed on your device. No image is
		ever sent to a server.
	</p>

	<p class="m-0 max-w-[44ch] text-base leading-6 text-text-dim">
		There are no accounts and no uploads. Closing the tab clears them.
	</p>

	<p class="m-0 max-w-[44ch] text-base leading-6 text-text-dim">
		The full source code is free on GitHub:
		<a
			class="text-accent underline hover:text-text focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-accent"
			href="https://github.com/SirCesarium/re-color"
			target="_blank"
			rel="noreferrer">github.com/SirCesarium/re-color</a
		>
	</p>

	<a
		class="mt-2 text-text-dim underline hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-accent"
		href={resolve('/')}>Back to recolor</a
	>
</main>
