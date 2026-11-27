<script lang="ts">
	import { tick } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import type { PixelPaintMode } from '#app/state/workflow/paint.ts';
	import { t } from '#app/text/index.ts';
	import {
		clampImageTransform,
		imageRectFor,
		pinchImageTransform,
		pixelAtPoint,
		zoomImageAtPoint,
		zoomLimits
	} from '#core/geometry/pixel-coords.ts';
	import { linePoints } from '#core/geometry/stroke-line.ts';
	import PixelPaintControls from '#app/widgets/PixelPaintControls.svelte';

	let {
		imageUrl = null,
		spriteFile = null,
		excludedPixels = [],
		brushSize = $bindable(1),
		paintMode = $bindable<PixelPaintMode>('toggle'),
		locked = $bindable(true),
		onTogglePixel,
		onPaintPixels,
		onInteract
	}: {
		imageUrl?: string | null;
		spriteFile?: File | null;
		excludedPixels?: readonly number[];
		brushSize?: number;
		paintMode?: PixelPaintMode;
		locked?: boolean;
		onTogglePixel?: (pixelIndex: number) => void;
		onPaintPixels?: (pixelIndexes: readonly number[], mode: PixelPaintMode) => void;
		onInteract?: () => void;
	} = $props();

	let root = $state<HTMLDivElement | null>(null);
	let viewport = $state<HTMLButtonElement | null>(null);
	let canvas = $state<HTMLCanvasElement | null>(null);
	let hoverCanvas = $state<HTMLCanvasElement | null>(null);
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
	let menuElement = $state<HTMLDivElement | null>(null);
	let menuOpen = $state(false);
	let menuX = $state(0);
	let menuY = $state(0);
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
	} | null = null;
	let lastTap = { time: 0, x: 0, y: 0 };
	let tapCandidate: { pointerId: number; x: number; y: number } | null = null;
	const activeTouches = new SvelteMap<number, { x: number; y: number }>();
	let pinch: {
		lastDistance: number;
		lastMidpoint: { x: number; y: number };
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

	// The brush is a discrete disk: every pixel whose center falls inside the
	// circle, so size 3 is a plus and size 5 reads round instead of square.
	const brushShape = $derived.by(() => {
		const size = Math.max(1, Math.round(brushSize));
		const center = (size - 1) / 2;
		const anchor = Math.floor(center);
		const radius = size / 2 - 0.25;
		const offsets: { dx: number; dy: number }[] = [];

		for (let y = 0; y < size; y++) {
			for (let x = 0; x < size; x++) {
				const dx = x - center;
				const dy = y - center;

				if (dx * dx + dy * dy <= radius * radius) {
					offsets.push({ dx: x - anchor, dy: y - anchor });
				}
			}
		}

		return offsets;
	});

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
			menuOpen = false;
			activeTouches.clear();
			pinch = null;

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
		const surface = hoverCanvas;
		const size = dimensions;
		const rect = imageRect;
		const pixel = hoverPixel;
		const shape = brushShape;
		const width = viewportWidth;
		const height = viewportHeight;

		if (!surface || !size || width <= 0 || height <= 0) return;

		const ratio = window.devicePixelRatio || 1;
		const backingWidth = Math.max(1, Math.round(width * ratio));
		const backingHeight = Math.max(1, Math.round(height * ratio));

		if (surface.width !== backingWidth || surface.height !== backingHeight) {
			surface.width = backingWidth;
			surface.height = backingHeight;
		}

		const context = surface.getContext('2d');

		if (!context) return;

		context.setTransform(ratio, 0, 0, ratio, 0, 0);
		context.clearRect(0, 0, width, height);

		if (pixel && rect) drawFootprint(context, size, rect, pixel, shape);
	});

	$effect(() => {
		if (!menuOpen) return;

		const closeOnOutsidePointer = (event: PointerEvent) => {
			if (menuElement?.contains(event.target as Node)) return;

			menuOpen = false;
		};

		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') menuOpen = false;
		};

		window.addEventListener('pointerdown', closeOnOutsidePointer, true);
		window.addEventListener('keydown', closeOnEscape);

		return () => {
			window.removeEventListener('pointerdown', closeOnOutsidePointer, true);
			window.removeEventListener('keydown', closeOnEscape);
		};
	});

	function redrawCanvas(
		surface = canvas,
		image = sourceImage,
		original = originalSprite,
		size = dimensions,
		mask = excludedSet
	) {
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
	}

	$effect(() => {
		redrawCanvas(canvas, sourceImage, originalSprite, dimensions, excludedSet);
	});

	function getPixelAt(clientX: number, clientY: number) {
		if (!viewport || !dimensions || !imageRect) return null;

		const bounds = viewport.getBoundingClientRect();

		return pixelAtPoint({ x: clientX, y: clientY }, bounds, imageRect, dimensions);
	}

	function brushIndexesAt(center: { x: number; y: number }): number[] {
		if (!dimensions) return [];

		const indexes: number[] = [];

		for (const { dx, dy } of brushShape) {
			const x = center.x + dx;
			const y = center.y + dy;

			if (x < 0 || y < 0 || x >= dimensions.width || y >= dimensions.height) continue;

			indexes.push(y * dimensions.width + x);
		}

		return indexes;
	}

	function targetExcluded(index: number): boolean {
		if (paintMode === 'disable') return true;
		if (paintMode === 'enable') return false;

		return !excludedSet.has(index);
	}

	/**
	 * Paints the brush footprint's border as an opaque mask on the overlay
	 * canvas. The canvas blends with `difference`, so the border inverts
	 * whatever sits under it and stays visible over any sprite color.
	 */
	function drawFootprint(
		context: CanvasRenderingContext2D,
		size: { width: number; height: number },
		rect: { left: number; top: number; scale: number },
		center: { x: number; y: number },
		shape: readonly { dx: number; dy: number }[]
	) {
		const cells = shape
			.map(({ dx, dy }) => ({ x: center.x + dx, y: center.y + dy }))
			.filter(({ x, y }) => x >= 0 && y >= 0 && x < size.width && y < size.height);

		if (cells.length === 0) return;

		const occupied = new Set(cells.map(({ x, y }) => `${x},${y}`));
		const filled = (x: number, y: number) => occupied.has(`${x},${y}`);
		const thickness = rect.scale >= 6 ? 2 : 1;

		context.fillStyle = '#ffffff';
		context.beginPath();

		for (const { x, y } of cells) {
			const left = Math.round(rect.left + x * rect.scale);
			const top = Math.round(rect.top + y * rect.scale);
			const right = Math.round(rect.left + (x + 1) * rect.scale);
			const bottom = Math.round(rect.top + (y + 1) * rect.scale);

			if (!filled(x, y - 1)) context.rect(left, top, right - left, thickness);
			if (!filled(x, y + 1)) context.rect(left, bottom - thickness, right - left, thickness);
			if (!filled(x - 1, y)) context.rect(left, top, thickness, bottom - top);
			if (!filled(x + 1, y)) context.rect(right - thickness, top, thickness, bottom - top);
		}

		context.fill();
	}

	function pinchGeometry(): { distance: number; midpoint: { x: number; y: number } } | null {
		if (!viewport || activeTouches.size !== 2) return null;

		const [first, second] = [...activeTouches.values()];
		const bounds = viewport.getBoundingClientRect();

		return {
			distance: Math.hypot(second.x - first.x, second.y - first.y),
			midpoint: {
				x: (first.x + second.x) / 2 - bounds.left,
				y: (first.y + second.y) / 2 - bounds.top
			}
		};
	}

	function cancelPointerStroke() {
		if (!pointerStroke) return;

		const pointerId = pointerStroke.pointerId;

		pointerStroke = null;

		if (viewport?.hasPointerCapture(pointerId)) {
			viewport.releasePointerCapture(pointerId);
		}

		redrawCanvas();
	}

	function startPinch() {
		const geometry = pinchGeometry();

		if (!geometry) return;

		pinch = { lastDistance: geometry.distance, lastMidpoint: geometry.midpoint };
	}

	function updatePinch() {
		const geometry = pinchGeometry();

		if (!geometry || !pinch) return;

		if (!dimensions || !limits || zoom <= 0 || pinch.lastDistance <= 0 || geometry.distance <= 0) {
			pinch = {
				lastDistance: geometry.distance > 0 ? geometry.distance : pinch.lastDistance,
				lastMidpoint: geometry.midpoint
			};

			return;
		}

		const nextZoom = Math.min(
			Math.max(zoom * (geometry.distance / pinch.lastDistance), limits.min),
			limits.max
		);
		const next = pinchImageTransform(
			{ width: viewportWidth, height: viewportHeight },
			dimensions,
			{ zoom, offsetX: offset.x, offsetY: offset.y },
			pinch.lastMidpoint,
			geometry.midpoint,
			nextZoom
		);

		zoom = next.zoom;
		offset = { x: next.offsetX, y: next.offsetY };
		pinch = { lastDistance: geometry.distance, lastMidpoint: geometry.midpoint };
	}

	function onPointerUp(event: PointerEvent) {
		if (event.pointerType === 'touch') {
			activeTouches.delete(event.pointerId);

			if (pinch) {
				if (activeTouches.size < 2) pinch = null;

				if (viewport?.hasPointerCapture(event.pointerId)) {
					viewport.releasePointerCapture(event.pointerId);
				}

				return;
			}
		}

		if (tapCandidate?.pointerId === event.pointerId) {
			const tapped =
				Math.abs(event.clientX - tapCandidate.x) <= 10 &&
				Math.abs(event.clientY - tapCandidate.y) <= 10;

			tapCandidate = null;

			// Locked canvas: a swipe belongs to the page scroll, so only a
			// double tap (the documented gesture) arms the brush.
			if (tapped) {
				const doubleTap =
					event.timeStamp - lastTap.time <= 350 &&
					Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <= 24;

				lastTap = { time: event.timeStamp, x: event.clientX, y: event.clientY };

				if (doubleTap) locked = false;
			}

			return;
		}

		if (pan?.pointerId === event.pointerId) {
			pan = null;

			if (viewport?.hasPointerCapture(event.pointerId)) {
				viewport.releasePointerCapture(event.pointerId);
			}

			return;
		}

		if (pointerStroke?.pointerId !== event.pointerId) return;

		const lastPixel = getPixelAt(event.clientX, event.clientY);

		if (lastPixel) addStrokeSegment(lastPixel);

		const stroke = pointerStroke;
		pointerStroke = null;

		if (!stroke || stroke.indexes.size === 0) return;

		onInteract?.();
		onPaintPixels?.([...stroke.indexes], paintMode);
	}

	function onPointerDown(event: PointerEvent) {
		if (!viewport) return;

		if (event.pointerType === 'touch') {
			if (activeTouches.size >= 2) return;

			activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });

			if (activeTouches.size === 2) {
				tapCandidate = null;
				cancelPointerStroke();
				startPinch();

				return;
			}
		}

		if (!event.isPrimary) return;

		// Touch scrolls the page while the brush is locked: painting needs
		// `touch-action: none`, and holding that while browsing traps the scroll.
		if (event.pointerType === 'touch' && locked) {
			tapCandidate = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };

			return;
		}

		if (event.button === 1) {
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

		const indexes = brushIndexesAt(pixel);

		pointerStroke = {
			pointerId: event.pointerId,
			lastPixel: { x: pixel.x, y: pixel.y },
			indexes: new Set(indexes)
		};

		// The first stamp must show immediately; waiting for the first move
		// leaves the press area unpainted until the stroke is committed.
		paintPreview(indexes);
		viewport.setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: PointerEvent) {
		if (event.pointerType === 'touch' && activeTouches.has(event.pointerId)) {
			activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });

			if (pinch && activeTouches.size === 2) {
				updatePinch();

				return;
			}
		}

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

		if (tapCandidate?.pointerId === event.pointerId) {
			if (Math.hypot(event.clientX - tapCandidate.x, event.clientY - tapCandidate.y) > 10) {
				tapCandidate = null;
			}

			return;
		}

		if (event.pointerType === 'mouse') {
			hoverPixel = pixel ? { x: pixel.x, y: pixel.y } : null;
		}

		if (!pixel || pointerStroke?.pointerId !== event.pointerId) return;

		addStrokeSegment(pixel);
	}

	function addStrokeSegment(pixel: { x: number; y: number }) {
		if (!pointerStroke) return;

		const stroke = pointerStroke;
		const added: number[] = [];

		// Every pixel between the last point and this one, so a fast drag
		// leaves no gaps in the stroke.
		for (const point of linePoints(stroke.lastPixel, pixel)) {
			for (const index of brushIndexesAt(point)) {
				if (stroke.indexes.has(index)) continue;

				stroke.indexes.add(index);
				added.push(index);
			}
		}

		stroke.lastPixel = { x: pixel.x, y: pixel.y };

		if (added.length > 0) paintPreview(added);
	}

	function paintPreview(indexes: readonly number[]) {
		const excluded: number[] = [];
		const restored: number[] = [];

		for (const index of indexes) {
			if (targetExcluded(index)) excluded.push(index);
			else restored.push(index);
		}

		paintPixels(new Set(excluded), originalSprite);
		paintPixels(new Set(restored), sourceImage);
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

	function onPointerCancel(event: PointerEvent) {
		if (event.pointerType === 'touch') {
			activeTouches.delete(event.pointerId);

			if (activeTouches.size < 2) pinch = null;
		}

		pan = null;
		cancelPointerStroke();
		tapCandidate = null;
	}

	function wheelDelta(event: WheelEvent) {
		if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
		if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * viewportHeight;

		return event.deltaY;
	}

	function onWheel(event: WheelEvent) {
		if (locked) return;
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

	async function openMenu(event: MouseEvent) {
		if (!root || !imageUrl || !dimensions || previewError) return;

		if (window.matchMedia?.('(pointer: coarse)').matches) return;

		const bounds = root.getBoundingClientRect();

		menuX = event.clientX - bounds.left;
		menuY = event.clientY - bounds.top;
		menuOpen = true;

		await tick();

		const panel = menuElement;

		if (!panel) return;

		menuX = Math.max(8, Math.min(menuX, bounds.width - panel.offsetWidth - 8));
		menuY = Math.max(8, Math.min(menuY, bounds.height - panel.offsetHeight - 8));
	}

	function onContextMenu(event: MouseEvent) {
		event.preventDefault();
		void openMenu(event);
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
	<div class="absolute inset-0" bind:this={root}>
		<button
			class="absolute inset-0 cursor-crosshair overflow-hidden border-0 bg-transparent p-0 text-left"
			style:touch-action={locked ? 'pan-y' : 'none'}
			bind:this={viewport}
			bind:clientWidth={viewportWidth}
			bind:clientHeight={viewportHeight}
			type="button"
			aria-label={t('result.canvasAria')}
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
				<canvas
					bind:this={hoverCanvas}
					class="pointer-events-none absolute inset-0 mix-blend-difference pointer-coarse:hidden [@media(hover:none)]:hidden"
					aria-hidden="true"
				></canvas>
			{/if}
		</button>
		{#if imageRect && zoomedIn}
			<button
				class="absolute right-1 bottom-1 z-10 cursor-pointer border-2 border-btn-edge bg-panel px-1.5 py-0.5 text-xs text-text shadow-[2px_2px_0_var(--btn-shadow)] transition-colors hover:bg-panel-hover"
				type="button"
				aria-label={t('result.zoomReset', { percent: Math.round(zoom * 100) })}
				onclick={resetZoom}
			>
				{Math.round(zoom * 100)}%
			</button>
		{/if}
		{#if menuOpen}
			<div
				bind:this={menuElement}
				class="absolute z-30 w-64 animate-[pop_160ms_ease-out] border-2 border-btn-edge bg-panel shadow-[4px_4px_0_var(--btn-shadow)]"
				style:left="{menuX}px"
				style:top="{menuY}px"
				role="dialog"
				aria-label={t('paint.aria')}
				tabindex="-1"
				oncontextmenu={(event) => event.preventDefault()}
			>
				<PixelPaintControls bind:brushSize bind:paintMode onClose={() => (menuOpen = false)} />
			</div>
		{/if}
	</div>
{:else if imageUrl && previewError}
	<div
		class="relative border border-border bg-panel-sunken px-4 py-2 text-base text-text"
		role="alert"
	>
		{t('result.previewError')}
	</div>
{:else if imageUrl}
	<div class="relative border border-border bg-panel-sunken px-4 py-2 text-base text-text">
		{t('result.loading')}
	</div>
{:else}
	<div class="relative border border-border bg-panel-sunken px-4 py-2 text-base text-text">
		{t('result.empty')}
	</div>
{/if}
