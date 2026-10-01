<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Privacy: re::color</title>
	<meta
		name="description"
		content="re::color runs entirely on your device. Your images are never uploaded to any server, and the source code is free on GitHub."
	/>
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Privacy: re::color" />
	<meta
		property="og:description"
		content="Everything runs on your device. Your images never leave your browser."
	/>
</svelte:head>

<main class="privacy">
	<h1 class="page-title">Privacy</h1>

	<p class="lead">
		Everything in re::color runs in your browser.
	</p>

	<p>
		The images you drop are read and processed on your device. No image is
		ever sent to a server.
	</p>

	<p>
		There are no accounts and no uploads. Closing the tab clears them.
	</p>

	<p>
		The full source code is free on GitHub:
		<a
			href="https://github.com/SirCesarium/re-color"
			target="_blank"
			rel="noreferrer">github.com/SirCesarium/re-color</a
		>
	</p>

	<a class="back" href={resolve('/')}>Back to recolor</a>
</main>

<style>
	main {
		flex: 1;
		width: 100%;
		max-width: 560px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24px;
		padding: 48px 16px;
		box-sizing: border-box;
		text-align: center;
	}

	.page-title {
		margin: 0;
		font-size: 32px;
		font-weight: 400;
		line-height: 1;
		color: var(--text);
		text-shadow: 4px 4px 0 var(--shadow);
	}

	p {
		margin: 0;
		font-size: 16px;
		line-height: 1.5;
		color: var(--text-dim);
		max-width: 44ch;
	}

	.lead {
		color: var(--text);
	}

	a {
		color: var(--accent);
		text-decoration: underline;
	}

	a:hover {
		color: var(--text);
	}

	a:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}

	.back {
		margin-top: 8px;
		color: var(--text-dim);
	}

	.back:hover {
		color: var(--accent);
	}
</style>
