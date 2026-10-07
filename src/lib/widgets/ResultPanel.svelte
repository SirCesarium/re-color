<script lang="ts">
	let {
		imageUrl = null,
		onDownload
	}: { imageUrl?: string | null; onDownload?: () => void } = $props();
</script>

<section
	class="animate-[rise_380ms_ease-out_240ms_backwards] flex w-full max-w-[480px] flex-col gap-2"
	aria-label="Result"
>
	<span class="text-base text-ok">Result</span>
	<div
	class="result relative flex aspect-square h-auto items-center justify-center overflow-hidden border border-border bg-panel-sunken"
	>
		<div class="checker"></div>
		{#if imageUrl}
			<img
				class="pointer-events-none absolute inset-0 h-full w-full object-contain [image-rendering:pixelated]"
				src={imageUrl}
				alt="Recolored sprite"
			/>
			<button
				class="absolute right-2 bottom-2 grid h-8 w-8 cursor-pointer place-items-center border-2 border-btn-edge bg-btn-bg p-0 text-btn-fg shadow-[3px_3px_0_var(--btn-shadow)] transition-[opacity,transform,background-color] duration-[150ms] ease-out hover:bg-[color-mix(in_srgb,var(--btn-bg)_85%,white)] active:bg-[color-mix(in_srgb,var(--btn-bg)_75%,black)] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-accent"
				type="button"
				aria-label="Download result"
				onclick={onDownload}
			>
				<svg
					class="h-4 w-4 [shape-rendering:crispEdges]"
					viewBox="0 0 16 16"
					fill="currentColor"
					aria-hidden="true"
				>
					<rect x="6" y="1" width="4" height="6" />
					<rect x="1" y="7" width="14" height="2" />
					<rect x="3" y="9" width="10" height="2" />
					<rect x="5" y="11" width="6" height="2" />
					<rect x="7" y="13" width="2" height="2" />
				</svg>
			</button>
		{:else}
			<span
				class="relative border border-border bg-panel-sunken px-4 py-2 text-base leading-6 text-text"
				>No result yet</span
			>
		{/if}
	</div>
</section>

<style>
	@keyframes drift {
		to {
			background-position: var(--checker-size) var(--checker-size);
		}
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

	@media (hover: hover) and (pointer: fine) {
		button[aria-label='Download result'] {
			opacity: 0;
			pointer-events: none;
			transform: translateY(6px);
		}

		.result:hover button[aria-label='Download result'] {
			opacity: 1;
			transform: translateY(0);
			pointer-events: auto;
		}
	}

	button[aria-label='Download result']:focus-visible {
		opacity: 1;
		transform: translateY(0);
		pointer-events: auto;
	}
</style>
