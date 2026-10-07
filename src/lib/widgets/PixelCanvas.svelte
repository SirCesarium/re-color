<script lang="ts">
	let {
		imageUrl = null,
		excludedPixels = [],
		onTogglePixel,
		onInteract
	}: {
		imageUrl?: string | null;
		excludedPixels?: readonly number[];
		onTogglePixel?: (pixelIndex: number) => void;
		onInteract?: () => void;
	} = $props();

	let viewport = $state<HTMLButtonElement | null>(null);
	let canvas = $state<HTMLCanvasElement | null>(null);
	let sourceImage = $state<HTMLImageElement | null>(null);
	let dimensions = $state<{ width: number; height: number } | null>(null);
	let previewError = $state(false);
	let hoverPixel = $state<{ x: number; y: number } | null>(null);
	let keyboardPixel = $state<{ x: number; y: number } | null>(null);

	$effect(() => {
		const url = imageUrl;

		if (!url) {
			sourceImage = null;
			dimensions = null;
			previewError = false;
			hoverPixel = null;
			keyboardPixel = null;

			return;
		}

		let cancelled = false;
		const image = new Image();

		image.onload = () => {
			if (cancelled) return;

			sourceImage = image;
			dimensions = { width: image.naturalWidth, height: image.naturalHeight };
			previewError = false;
		};

		image.onerror = () => {
			if (!cancelled) previewError = true;
		};

		image.src = url;

		return () => {
			cancelled = true;
			image.onload = null;
			image.onerror = null;
		};
	});

	$effect(() => {
		const surface = canvas;
		const image = sourceImage;
		const size = dimensions;

		if (!surface || !image || !size) return;

		surface.width = size.width;
		surface.height = size.height;

		const context = surface.getContext('2d');

		if (!context) {
			previewError = true;

			return;
		}

		context.imageSmoothingEnabled = false;
		context.clearRect(0, 0, size.width, size.height);
		context.drawImage(image, 0, 0);
	});

	function getImageRect() {
		if (!viewport || !dimensions) return null;

		const bounds = viewport.getBoundingClientRect();
		const scale = Math.min(bounds.width / dimensions.width, bounds.height / dimensions.height);

		return {
			left: (bounds.width - dimensions.width * scale) / 2,
			top: (bounds.height - dimensions.height * scale) / 2,
			scale
		};
	}

	function getPixelAt(clientX: number, clientY: number) {
		if (!viewport || !dimensions) return null;

		const bounds = viewport.getBoundingClientRect();
		const imageRect = getImageRect();

		if (!imageRect || imageRect.scale <= 0) return null;

		const x = Math.floor(
			(clientX - bounds.left - imageRect.left) / imageRect.scale
		);
		const y = Math.floor(
			(clientY - bounds.top - imageRect.top) / imageRect.scale
		);

		if (x < 0 || y < 0 || x >= dimensions.width || y >= dimensions.height) return null;

		return { x, y, index: y * dimensions.width + x };
	}

	function getHoverStyle() {
		const imageRect = getImageRect();

		if (!imageRect || !hoverPixel) return '';

		return `left:${imageRect.left + hoverPixel.x * imageRect.scale}px;top:${imageRect.top + hoverPixel.y * imageRect.scale}px;width:${imageRect.scale}px;height:${imageRect.scale}px`;
	}

	function toggleAt(clientX: number, clientY: number) {
		const pixel = getPixelAt(clientX, clientY);

		if (!pixel) return;

		onInteract?.();
		onTogglePixel?.(pixel.index);
	}

	function onPointerUp(event: PointerEvent) {
		if (event.button > 0) return;

		toggleAt(event.clientX, event.clientY);
	}

	function onPointerMove(event: PointerEvent) {
		if (event.pointerType !== 'mouse') return;

		const pixel = getPixelAt(event.clientX, event.clientY);

		hoverPixel = pixel ? { x: pixel.x, y: pixel.y } : null;
	}

	function onPointerLeave() {
		hoverPixel = null;
	}

	function onKeyDown(event: KeyboardEvent) {
		if (!dimensions) return;

		const selected = keyboardPixel ?? {
			x: Math.floor(dimensions.width / 2),
			y: Math.floor(dimensions.height / 2)
		};

		if (event.key === ' ' || event.key === 'Enter') {
			event.preventDefault();
			onInteract?.();
			onTogglePixel?.(selected.y * dimensions.width + selected.x);

			return;
		}

		let x = selected.x;
		let y = selected.y;

		if (event.key === 'ArrowLeft') x--;
		else if (event.key === 'ArrowRight') x++;
		else if (event.key === 'ArrowUp') y--;
		else if (event.key === 'ArrowDown') y++;
		else return;

		event.preventDefault();
		x = Math.max(0, Math.min(dimensions.width - 1, x));
		y = Math.max(0, Math.min(dimensions.height - 1, y));
		keyboardPixel = { x, y };
		hoverPixel = keyboardPixel;
	}
</script>

{#if imageUrl && dimensions && !previewError}
	<button
		class="viewport absolute inset-0 overflow-hidden"
		bind:this={viewport}
		type="button"
		aria-label="Interactive sprite preview. Tap or click a pixel to toggle recoloring. Use arrow keys to select and Space to toggle."
		onpointerup={onPointerUp}
		onpointermove={onPointerMove}
		onpointerleave={onPointerLeave}
		onkeydown={onKeyDown}
	>
		<canvas
			bind:this={canvas}
			class="preview-canvas absolute inset-0 h-full w-full object-contain [image-rendering:pixelated]"
			aria-hidden="true"
		></canvas>
		{#if hoverPixel}
			<span
				class="pixel-hover pointer-events-none absolute"
				style={getHoverStyle()}
			></span>
		{/if}
	</button>
{:else if imageUrl && previewError}
	<div class="preview-message" role="alert">Could not load preview</div>
{:else if imageUrl}
	<div class="preview-message">Loading preview...</div>
{:else}
	<div class="preview-message">No result yet</div>
{/if}

<style>
	.viewport {
		touch-action: manipulation;
		cursor: crosshair;
		outline-offset: -3px;
		padding: 0;
		border: 0;
		background: transparent;
		text-align: left;
	}

	.preview-canvas {
		pointer-events: none;
	}

	.pixel-hover {
		border: 1px solid var(--accent);
		box-shadow: inset 0 0 0 1px var(--panel);
	}

	.preview-message {
		position: relative;
		border: 1px solid var(--border);
		background: var(--panel-sunken);
		padding: 8px 16px;
		color: var(--text);
		font-size: 16px;
	}

	@media (hover: none), (pointer: coarse) {
		.pixel-hover {
			display: none;
		}
	}
</style>
