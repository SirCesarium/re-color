<script lang="ts">
	let {
		imageUrl = null,
		onDownload
	}: { imageUrl?: string | null; onDownload?: () => void } = $props();
</script>

<section class="result-wrap" aria-label="Result">
	<span class="result-title">Result</span>
	<div class="result">
		<div class="checker"></div>
		{#if imageUrl}
			<img class="out" src={imageUrl} alt="Recolored sprite" />
			<button class="save" type="button" aria-label="Download result" onclick={onDownload}>
				<svg class="save-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
					<rect x="6" y="1" width="4" height="6" />
					<rect x="1" y="7" width="14" height="2" />
					<rect x="3" y="9" width="10" height="2" />
					<rect x="5" y="11" width="6" height="2" />
					<rect x="7" y="13" width="2" height="2" />
				</svg>
			</button>
		{:else}
			<span class="result-hint">No result yet</span>
		{/if}
	</div>
</section>

<style>
	@keyframes drift {
		to {
			background-position: var(--checker-size) var(--checker-size);
		}
	}

	.result-wrap {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		max-width: 480px;
		animation: rise 380ms ease-out 240ms backwards;
	}

	.result-title {
		font-size: 16px;
		color: var(--ok);
	}

	.result {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 1;
		height: auto;
		background: var(--panel-sunken);
		border: 1px solid var(--border);
		overflow: hidden;
	}

	.checker {
		position: absolute;
		inset: 0;
		background:
			conic-gradient(
				var(--panel) 0 25%,
				transparent 0 50%,
				var(--panel) 0 75%,
				transparent 0
			) 0 0 / var(--checker-size) var(--checker-size);
		opacity: 0.35;
	}

	.result:hover .checker {
		animation: drift 4s linear infinite;
	}

	.out {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		image-rendering: pixelated;
		pointer-events: none;
	}

	.result-hint {
		position: relative;
		font-size: 16px;
		line-height: 1.5;
		color: var(--text);
		background: var(--panel-sunken);
		border: 1px solid var(--border);
		padding: 8px 16px;
	}

	.save {
		position: absolute;
		right: 8px;
		bottom: 8px;
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		padding: 0;
		color: var(--btn-fg);
		background: var(--btn-bg);
		border: 2px solid var(--btn-edge);
		box-shadow: 3px 3px 0 var(--btn-shadow);
		cursor: pointer;
		transition:
			opacity 150ms linear,
			transform 150ms ease-out,
			background-color 120ms linear;
	}

	@media (hover: hover) and (pointer: fine) {
		.save {
			opacity: 0;
			pointer-events: none;
			transform: translateY(6px);
		}

		.result:hover .save {
			opacity: 1;
			transform: translateY(0);
			pointer-events: auto;
		}
	}

	.save:focus-visible {
		opacity: 1;
		transform: translateY(0);
		pointer-events: auto;
	}

	.save:hover {
		background: color-mix(in srgb, var(--btn-bg) 85%, white);
	}

	.save:active {
		background: color-mix(in srgb, var(--btn-bg) 75%, black);
	}

	.save:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}

	.save-icon {
		width: 16px;
		height: 16px;
		shape-rendering: crispEdges;
	}
</style>
