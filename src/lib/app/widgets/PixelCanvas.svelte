<script lang="ts">
	import { t } from 'svelte-i18n';

	import {
		clampImageTransform,
		imageRectFor,
		pixelAtPoint,
		zoomImageAtPoint,
		zoomLimits
	} from '#core/geometry/pixel-coords.ts';
	import { linePoints } from '#core/geometry/stroke-line.ts';

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
	let viewportWidth = $state(0);
	let viewportHeight = $state(0);
	let zoom = $state(0);
	let offset = $state({ x: 0, y: 0 });
	let lastImageSize = '';
	let pan: {
		pointerId: number;
		startX: number;
		startY: number;
		startOffsetX: number;
		startOffsetY: number;
	} | null = null;
	let pointerStroke: {
		pointerId: number;
		lastPixel: { x: number; y: number };
		indexes: Set<number>;
		dragging: boolean;
		excluded: boolean;
	} | null = null;

	// One membership structure for the exclusion mask: the pointer-down
	// check and the paint pass both ask "is this index excluded?", which a
	// Set answers in O(1) instead of scanning the array per question.
	const excludedSet = $derived(new Set(excludedPixels));

	const viewportSize = $derived({ width: viewportWidth, height: viewportHeight });
	const limits = $derived(dimensions ? zoomLimits(viewportSize, dimensions) : null);
	const imageRect = $derived(
		dimensions && zoom > 0 && viewportWidth > 0 && viewportHeight > 0
			? imageRectFor(viewportSize, dimensions, { zoom, offsetX: offset.x, offsetY: offset.y })
			: null
	);
	const zoomedIn = $derived(limits !== null && zoom > limits.min);

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
			zoom = 0;
			offset = { x: 0, y: 0 };
			lastImageSize = '';

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
		const size = dimensions;

		if (!size || viewportWidth <= 0 || viewportHeight <= 0) return;

		const key = `${size.width}x${size.height}`;

		if (key === lastImageSize) return;

		lastImageSize = key;

		const next = zoomLimits({ width: viewportWidth, height: viewportHeight }, size);

		zoom = next.min;
		offset = { x: 0, y: 0 };
	});

	$effect(() => {
		const size = dimensions;

		if (!size || viewportWidth <= 0 || viewportHeight <= 0 || zoom <= 0) return;

		const bounds = zoomLimits({ width: viewportWidth, height: viewportHeight }, size);
		const clampedZoom = Math.min(Math.max(zoom, bounds.min), bounds.max);
		const clamped = clampImageTransform({ width: viewportWidth, height: viewportHeight }, size, {
			zoom: clampedZoom,
			offsetX: offset.x,
			offsetY: offset.y
		});

		if (clampedZoom !== zoom) zoom = clampedZoom;

		if (clamped.offsetX !== offset.x || clamped.offsetY !== offset.y) {
			offset = { x: clamped.offsetX, y: clamped.offsetY };
		}
	});

	$effect(() => {
		const surface = canvas;
		const image = sourceImage;
		const original = originalSprite;
		const size = dimensions;
		const mask = excludedSet;

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

		if (original && mask.size > 0) paintPixels(mask, original);
	});

	function getPixelAt(clientX: number, clientY: number) {
		if (!viewport || !dimensions || !imageRect) return null;

		const bounds = viewport.getBoundingClientRect();

		return pixelAtPoint({ x: clientX, y: clientY }, bounds, imageRect, dimensions);
	}

	function getHoverStyle() {
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
		if (pan?.pointerId === event.pointerId) {
			pan = null;

			if (viewport?.hasPointerCapture(event.pointerId)) {
				viewport.releasePointerCapture(event.pointerId);
			}

			return;
		}

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
		if (!event.isPrimary || !viewport) return;

		if (event.button === 1 || event.button === 2) {
			event.preventDefault();
			pan = {
				pointerId: event.pointerId,
				startX: event.clientX,
				startY: event.clientY,
				startOffsetX: offset.x,
				startOffsetY: offset.y
			};
			viewport.setPointerCapture(event.pointerId);

			return;
		}

		if (event.button !== 0) return;

		const pixel = getPixelAt(event.clientX, event.clientY);

		if (!pixel) return;

		event.preventDefault();
		const excluded = excludedSet.has(pixel.index);
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
		if (pan?.pointerId === event.pointerId) {
			if (!dimensions || viewportWidth <= 0 || viewportHeight <= 0) return;

			const next = clampImageTransform(
				{ width: viewportWidth, height: viewportHeight },
				dimensions,
				{
					zoom,
					offsetX: pan.startOffsetX + event.clientX - pan.startX,
					offsetY: pan.startOffsetY + event.clientY - pan.startY
				}
			);

			offset = { x: next.offsetX, y: next.offsetY };

			return;
		}

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

		const size = dimensions;
		const stroke = pointerStroke;

		// Every pixel between the last point and this one, so a fast drag
		// leaves no gaps in the stroke.
		const segment = new Set(
			linePoints(stroke.lastPixel, pixel).map((point) => {
				const index = point.y * size.width + point.x;
				stroke.indexes.add(index);

				return index;
			})
		);

		stroke.lastPixel = { x: pixel.x, y: pixel.y };

		if (stroke.dragging) {
			const image = stroke.excluded ? originalSprite : sourceImage;
			paintPixels(segment, image);
		}
	}

	function paintPixels(indexes: ReadonlySet<number>, image: HTMLImageElement | null) {
		if (!canvas || !image || !dimensions || indexes.size === 0) return;

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
		pan = null;
		pointerStroke = null;
	}

	function wheelDelta(event: WheelEvent) {
		if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
		if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * viewportHeight;

		return event.deltaY;
	}

	function onWheel(event: WheelEvent) {
		if (!viewport || !dimensions || !limits || !imageRect) return;

		event.preventDefault();

		const bounds = viewport.getBoundingClientRect();
		const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
		const nextZoom = Math.min(
			Math.max(zoom * Math.exp(-wheelDelta(event) * 0.0015), limits.min),
			limits.max
		);

		if (nextZoom === zoom) return;

		const next = zoomImageAtPoint(
			{ width: viewportWidth, height: viewportHeight },
			dimensions,
			{ zoom, offsetX: offset.x, offsetY: offset.y },
			point,
			nextZoom
		);

		zoom = next.zoom;
		offset = { x: next.offsetX, y: next.offsetY };
	}

	function resetZoom() {
		if (!limits) return;

		zoom = limits.min;
		offset = { x: 0, y: 0 };
	}

	function onContextMenu(event: MouseEvent) {
		event.preventDefault();
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
	<div class="absolute inset-0">
		<button
			class="absolute inset-0 cursor-crosshair touch-none overflow-hidden border-0 bg-transparent p-0 text-left"
			bind:this={viewport}
			bind:clientWidth={viewportWidth}
			bind:clientHeight={viewportHeight}
			type="button"
			aria-label={$t('result.canvasAria')}
			onpointerup={onPointerUp}
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerleave={onPointerLeave}
			onpointercancel={onPointerCancel}
			onkeydown={onKeyDown}
			onwheel={onWheel}
			oncontextmenu={onContextMenu}
		>
			{#if imageRect}
				<canvas
					bind:this={canvas}
					class="pointer-events-none absolute [image-rendering:pixelated]"
					style:left="{imageRect.left}px"
					style:top="{imageRect.top}px"
					style:width="{dimensions.width * imageRect.scale}px"
					style:height="{dimensions.height * imageRect.scale}px"
					aria-hidden="true"
				></canvas>
				{#if hoverPixel}
					<span
						class="pointer-events-none absolute border border-accent shadow-[inset_0_0_0_1px_var(--panel)] pointer-coarse:hidden [@media(hover:none)]:hidden"
						style={getHoverStyle()}
					></span>
				{/if}
			{/if}
		</button>
		{#if imageRect && zoomedIn}
			<button
				class="absolute right-1 bottom-1 z-10 cursor-pointer border-2 border-btn-edge bg-panel px-1.5 py-0.5 text-xs text-text shadow-[2px_2px_0_var(--btn-shadow)] transition-colors hover:bg-panel-hover"
				type="button"
				aria-label={$t('result.zoomReset', {
					values: { percent: Math.round(zoom * 100) }
				})}
				onclick={resetZoom}
			>
				{Math.round(zoom * 100)}%
			</button>
		{/if}
	</div>
{:else if imageUrl && previewError}
	<div
		class="relative border border-border bg-panel-sunken px-4 py-2 text-base text-text"
		role="alert"
	>
		{$t('result.previewError')}
	</div>
{:else if imageUrl}
	<div class="relative border border-border bg-panel-sunken px-4 py-2 text-base text-text">
		{$t('result.loading')}
	</div>
{:else}
	<div class="relative border border-border bg-panel-sunken px-4 py-2 text-base text-text">
		{$t('result.empty')}
	</div>
{/if}
