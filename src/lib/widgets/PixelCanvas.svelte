<script lang="ts">
	import { t } from 'svelte-i18n';
	let {
		imageUrl = null,
		spriteFile = null,
		excludedPixels = [],
		onTogglePixel,
		onSetPixelExclusion,
		onInteract
	}: {
		imageUrl?: string | null;
		spriteFile?: File | null;
		excludedPixels?: readonly number[];
		onTogglePixel?: (pixelIndex: number) => void;
		onSetPixelExclusion?: (pixelIndexes: readonly number[], excluded: boolean) => void;
		onInteract?: () => void;
	} = $props();

	let viewport = $state<HTMLButtonElement | null>(null);
	let canvas = $state<HTMLCanvasElement | null>(null);
	let sourceImage = $state<HTMLImageElement | null>(null);
	let originalSprite = $state<HTMLImageElement | null>(null);
	let dimensions = $state<{ width: number; height: number } | null>(null);
	let previewError = $state(false);
	let hoverPixel = $state<{ x: number; y: number } | null>(null);
	let keyboardPixel = $state<{ x: number; y: number } | null>(null);
	let pointerStroke: {
		pointerId: number;
		lastPixel: { x: number; y: number };
		indexes: Set<number>;
		dragging: boolean;
		excluded: boolean;
	} | null = null;

	$effect(() => {
		const file = spriteFile;

		if (!file) {
			originalSprite = null;

			return;
		}

		let cancelled = false;
		const url = URL.createObjectURL(file);
		const image = new Image();

		image.onload = () => {
			if (!cancelled) originalSprite = image;
		};

		image.onerror = () => {
			if (!cancelled) {
				console.error('Could not load the original sprite for live pixel exclusion');
				previewError = true;
			}
		};

		image.src = url;

		return () => {
			cancelled = true;
			image.onload = null;
			image.onerror = null;
			URL.revokeObjectURL(url);
		};
	});

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
		const original = originalSprite;
		const size = dimensions;
		const mask = excludedPixels;

		if (!surface || !image || !size) return;

		surface.width = size.width;
		surface.height = size.height;

		const context = surface.getContext('2d');

		if (!context) {
			previewError = true;

			return;
		}

		context.imageSmoothingEnabled = false;
		context.filter = 'none';
		context.clearRect(0, 0, size.width, size.height);
		context.drawImage(image, 0, 0);

		if (original && mask.length > 0) paintPixels(mask, original);
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
		if (pointerStroke?.pointerId !== event.pointerId) return;

		const lastPixel = getPixelAt(event.clientX, event.clientY);
		const size = dimensions;

		if (lastPixel && size) {
			const lastIndex = pointerStroke.lastPixel.y * size.width + pointerStroke.lastPixel.x;

			if (lastPixel.index !== lastIndex) {
				pointerStroke.dragging = true;
			}
			addStrokeSegment(lastPixel);
		}

		const stroke = pointerStroke;
		const indexes = [...stroke.indexes];
		pointerStroke = null;

		if (stroke.dragging) {
			onInteract?.();
			onSetPixelExclusion?.(indexes, stroke.excluded);
		} else {
			toggleAt(event.clientX, event.clientY);
		}
	}

	function onPointerDown(event: PointerEvent) {
		if (!event.isPrimary || event.button !== 0 || !viewport) return;

		const pixel = getPixelAt(event.clientX, event.clientY);

		if (!pixel) return;

		event.preventDefault();
		const excluded = excludedPixels.includes(pixel.index);
		pointerStroke = {
			pointerId: event.pointerId,
			lastPixel: { x: pixel.x, y: pixel.y },
			indexes: new Set([pixel.index]),
			dragging: false,
			excluded: !excluded
		};
		viewport.setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: PointerEvent) {
		const pixel = getPixelAt(event.clientX, event.clientY);
		const size = dimensions;

		if (event.pointerType === 'mouse') {
			hoverPixel = pixel ? { x: pixel.x, y: pixel.y } : null;
		}

		if (!pixel || !size || pointerStroke?.pointerId !== event.pointerId) return;

		const lastIndex = pointerStroke.lastPixel.y * size.width + pointerStroke.lastPixel.x;

		if (!pointerStroke.dragging && pixel.index !== lastIndex) {
			pointerStroke.dragging = true;
		}

		if (pointerStroke.dragging) addStrokeSegment(pixel);
	}

	function addStrokeSegment(pixel: { x: number; y: number; index: number }) {
		if (!pointerStroke || !dimensions) return;

		let x0 = pointerStroke.lastPixel.x;
		let y0 = pointerStroke.lastPixel.y;
		const x1 = pixel.x;
		const y1 = pixel.y;
		const dx = Math.abs(x1 - x0);
		const sx = x0 < x1 ? 1 : -1;
		const dy = -Math.abs(y1 - y0);
		const sy = y0 < y1 ? 1 : -1;
		let error = dx + dy;
		const segment: number[] = [];

		while (true) {
			const index = y0 * dimensions.width + x0;
			pointerStroke.indexes.add(index);
			segment.push(index);

			if (x0 === x1 && y0 === y1) break;

			const doubledError = 2 * error;

			if (doubledError >= dy) {
				error += dy;
				x0 += sx;
			}

			if (doubledError <= dx) {
				error += dx;
				y0 += sy;
			}
		}

		pointerStroke.lastPixel = { x: x1, y: y1 };

		if (pointerStroke.dragging) {
			const image = pointerStroke.excluded ? originalSprite : sourceImage;
			paintPixels(segment, image);
		}
	}

	function paintPixels(indexes: readonly number[], image: HTMLImageElement | null) {
		if (!canvas || !image || !dimensions || indexes.length === 0) return;

		const context = canvas.getContext('2d');
		if (!context) return;

		context.save();
		context.beginPath();

		for (const index of indexes) {
			const x = index % dimensions.width;
			const y = Math.floor(index / dimensions.width);
			context.rect(x, y, 1, 1);
		}

		context.clip();
		context.clearRect(0, 0, dimensions.width, dimensions.height);
		context.imageSmoothingEnabled = false;
		context.filter = 'none';
		context.drawImage(image, 0, 0);
		context.restore();
	}

	function onPointerLeave() {
		if (!pointerStroke) hoverPixel = null;
	}

	function onPointerCancel() {
		pointerStroke = null;
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
		aria-label={$t('result.canvasAria')}
		onpointerup={onPointerUp}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerleave={onPointerLeave}
		onpointercancel={onPointerCancel}
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
	<div class="preview-message" role="alert">{$t('result.previewError')}</div>
{:else if imageUrl}
	<div class="preview-message">{$t('result.loading')}</div>
{:else}
	<div class="preview-message">{$t('result.empty')}</div>
{/if}

<style>
	.viewport {
		touch-action: none;
		cursor: crosshair;
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
