import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PixelCanvas from '../../src/lib/app/widgets/PixelCanvas.svelte';
import { t } from '../../src/lib/app/text/index.ts';

const OriginalImage = globalThis.Image;
const OriginalResizeObserver = globalThis.ResizeObserver;

class FakeResizeObserver {
	private callback: ResizeObserverCallback;

	constructor(callback: ResizeObserverCallback) {
		this.callback = callback;
	}

	observe(target: Element) {
		queueMicrotask(() => {
			this.callback([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver);
		});
	}

	unobserve() {}
	disconnect() {}
}

class FakeImage {
	naturalWidth = 10;
	naturalHeight = 10;
	onload: (() => void) | null = null;
	onerror: (() => void) | null = null;

	set src(_value: string) {
		queueMicrotask(() => {
			this.onload?.();
		});
	}
}

function pointerEvent(
	type: string,
	init: {
		pointerId: number;
		pointerType?: string;
		isPrimary?: boolean;
		button?: number;
		clientX: number;
		clientY: number;
	}
): PointerEvent {
	const EventCtor = typeof PointerEvent !== 'undefined' ? PointerEvent : MouseEvent;

	return new EventCtor(type, {
		bubbles: true,
		cancelable: true,
		...init,
		button: init.button ?? 0
	}) as PointerEvent;
}

async function flush(): Promise<void> {
	await tick();
	await new Promise((resolve) => setTimeout(resolve, 0));
	await tick();
}

describe('PixelCanvas touch pinch-to-zoom', () => {
	beforeEach(() => {
		globalThis.Image = FakeImage as unknown as typeof Image;
		globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
		vi.spyOn(HTMLButtonElement.prototype, 'clientWidth', 'get').mockReturnValue(200);
		vi.spyOn(HTMLButtonElement.prototype, 'clientHeight', 'get').mockReturnValue(200);

		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
			imageSmoothingEnabled: false,
			filter: 'none',
			clearRect: vi.fn(),
			drawImage: vi.fn(),
			setTransform: vi.fn(),
			save: vi.fn(),
			beginPath: vi.fn(),
			rect: vi.fn(),
			clip: vi.fn(),
			restore: vi.fn(),
			fill: vi.fn()
		} as unknown as CanvasRenderingContext2D);
	});

	afterEach(() => {
		globalThis.Image = OriginalImage;
		globalThis.ResizeObserver = OriginalResizeObserver;
		vi.restoreAllMocks();
	});

	async function mountCanvas(locked: boolean, onPaintPixels = vi.fn()) {
		render(PixelCanvas, {
			props: {
				imageUrl: 'blob:result',
				locked,
				onPaintPixels
			}
		});

		await flush();

		const viewport = screen.getByRole('button', { name: t('result.canvasAria') });

		vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
			left: 0,
			top: 0,
			right: 200,
			bottom: 200,
			width: 200,
			height: 200,
			x: 0,
			y: 0,
			toJSON: () => ({})
		});
		viewport.setPointerCapture = vi.fn();
		viewport.releasePointerCapture = vi.fn();
		viewport.hasPointerCapture = vi.fn(() => false);

		await fireEvent(viewport, new Event('resize'));
		await flush();

		return { viewport, onPaintPixels };
	}

	it('pinch-zooms when unlocked without painting an accidental pixel', async () => {
		const { viewport, onPaintPixels } = await mountCanvas(false);

		expect(viewport.style.touchAction).toBe('none');

		await fireEvent(
			viewport,
			pointerEvent('pointerdown', {
				pointerId: 1,
				pointerType: 'touch',
				isPrimary: true,
				clientX: 90,
				clientY: 100
			})
		);
		await fireEvent(
			viewport,
			pointerEvent('pointerdown', {
				pointerId: 2,
				pointerType: 'touch',
				isPrimary: false,
				clientX: 110,
				clientY: 100
			})
		);
		await fireEvent(
			viewport,
			pointerEvent('pointermove', {
				pointerId: 1,
				pointerType: 'touch',
				isPrimary: true,
				clientX: 80,
				clientY: 100
			})
		);
		await fireEvent(
			viewport,
			pointerEvent('pointermove', {
				pointerId: 2,
				pointerType: 'touch',
				isPrimary: false,
				clientX: 120,
				clientY: 100
			})
		);
		await fireEvent(
			viewport,
			pointerEvent('pointerup', {
				pointerId: 1,
				pointerType: 'touch',
				isPrimary: true,
				clientX: 80,
				clientY: 100
			})
		);
		await fireEvent(
			viewport,
			pointerEvent('pointerup', {
				pointerId: 2,
				pointerType: 'touch',
				isPrimary: false,
				clientX: 120,
				clientY: 100
			})
		);

		await flush();

		expect(onPaintPixels).not.toHaveBeenCalled();
		expect(screen.getByRole('button', { name: /4000%/ })).toBeTruthy();
	});

	it('allows two-finger pinch-zoom even while canvas is locked', async () => {
		const { viewport } = await mountCanvas(true);

		expect(viewport.style.touchAction).toBe('pan-y');

		await fireEvent(
			viewport,
			pointerEvent('pointerdown', {
				pointerId: 1,
				pointerType: 'touch',
				isPrimary: true,
				clientX: 90,
				clientY: 100
			})
		);
		await fireEvent(
			viewport,
			pointerEvent('pointerdown', {
				pointerId: 2,
				pointerType: 'touch',
				isPrimary: false,
				clientX: 110,
				clientY: 100
			})
		);
		await fireEvent(
			viewport,
			pointerEvent('pointermove', {
				pointerId: 1,
				pointerType: 'touch',
				isPrimary: true,
				clientX: 80,
				clientY: 100
			})
		);
		await fireEvent(
			viewport,
			pointerEvent('pointermove', {
				pointerId: 2,
				pointerType: 'touch',
				isPrimary: false,
				clientX: 120,
				clientY: 100
			})
		);

		await flush();

		expect(screen.getByRole('button', { name: /4000%/ })).toBeTruthy();
	});
});
