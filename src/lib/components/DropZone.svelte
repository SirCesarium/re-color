<script lang="ts">
	let {
		label,
		hint,
		variant,
		file = $bindable(null)
	}: {
		label: string;
		hint: string;
		variant: 'ref' | 'base';
		file: File | null;
	} = $props();

	let preview = $state<string | null>(null);
	let dragging = $state(false);

	$effect(() => {
		const url = preview;
		return () => {
			if (url) URL.revokeObjectURL(url);
		};
	});

	function load(candidate: File | undefined) {
		if (!candidate || !candidate.type.startsWith('image/')) return;
		preview = URL.createObjectURL(candidate);
		file = candidate;
	}

	function onInput(event: Event) {
		load((event.currentTarget as HTMLInputElement).files?.[0]);
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
		dragging = true;
	}

	function onDragLeave(event: DragEvent) {
		const zone = event.currentTarget as HTMLElement;
		if (zone.contains(event.relatedTarget as Node | null)) return;
		dragging = false;
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		load(event.dataTransfer?.files[0]);
	}
</script>

<label
	class="drop drop-{variant}"
	class:dragging
	class:filled={preview !== null}
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
>
	<input
		class="sr-only"
		type="file"
		accept="image/*"
		aria-label="Upload {label} image"
		onchange={onInput}
	/>

	{#if dragging}
		<span class="hint-overlay" aria-hidden="true">
			<span class="hint-checker"></span>
			<span class="marquee">
				<span class="track">
					{#each Array(6) as _, i (i)}
						<span>DROP IT HERE!</span>
					{/each}
				</span>
			</span>
		</span>
	{:else if preview}
		<span class="checker" aria-hidden="true"></span>
		<img class="thumb" src={preview} alt="" />
		<span class="tag">{label}</span>
	{:else}
		<span class="drop-label">{label}</span>
		<span class="drop-hint">{hint}</span>
	{/if}
</label>

<style>
	@keyframes ants {
		to {
			background-position: 16px 0, -16px 100%, 0 -16px, 100% 16px;
		}
	}

	@keyframes hint-drift {
		to {
			background-position: 32px 32px;
		}
	}

	@keyframes hint-slide {
		to {
			transform: translateX(-50%);
		}
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}

	.drop {
		position: relative;
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		aspect-ratio: 1;
		height: auto;
		padding: 0 12px;
		background-color: var(--panel);
		color: var(--border-dash);
		background-image:
			repeating-linear-gradient(90deg, currentColor 0 8px, transparent 8px 16px),
			repeating-linear-gradient(90deg, currentColor 0 8px, transparent 8px 16px),
			repeating-linear-gradient(180deg, currentColor 0 8px, transparent 8px 16px),
			repeating-linear-gradient(180deg, currentColor 0 8px, transparent 8px 16px);
		background-size: 16px 2px, 16px 2px, 2px 16px, 2px 16px;
		background-position: 0 0, 0 100%, 0 0, 100% 0;
		background-repeat: repeat-x, repeat-x, repeat-y, repeat-y;
		cursor: pointer;
		text-align: center;
		overflow: hidden;
		transition:
			color 120ms linear,
			background-color 120ms linear,
			transform 120ms ease-out;
	}

	.drop:hover {
		transform: translateY(-3px);
		animation: ants 500ms linear infinite;
	}

	.drop-ref:hover {
		color: var(--ref);
		background-color: var(--panel-hover);
	}

	.drop-base:hover {
		color: var(--base);
		background-color: var(--panel-hover);
	}

	.drop:has(input:focus-visible) {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	.drop.filled {
		background-color: var(--panel-sunken);
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
			) 0 0 / 8px 8px;
		opacity: 0.5;
		pointer-events: none;
	}

	.thumb {
		position: relative;
		width: 100%;
		height: 100%;
		object-fit: contain;
		image-rendering: pixelated;
		pointer-events: none;
	}

	.tag {
		position: absolute;
		top: 6px;
		left: 6px;
		font-size: 16px;
		line-height: 1;
		padding: 4px 6px;
		background: var(--panel);
		border: 1px solid var(--border);
		pointer-events: none;
	}

	.drop-ref .tag {
		color: var(--ref);
	}

	.drop-base .tag {
		color: var(--base);
	}

	.hint-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		overflow: hidden;
		background: var(--panel);
		pointer-events: none;
	}

	.drop-ref {
		--zone-accent: var(--ref);
	}

	.drop-base {
		--zone-accent: var(--base);
	}

	.hint-checker {
		position: absolute;
		inset: 0;
		background:
			conic-gradient(
				var(--zone-accent) 0 25%,
				transparent 0 50%,
				var(--zone-accent) 0 75%,
				transparent 0
			) 0 0 / 32px 32px;
		opacity: 0.3;
		animation: hint-drift 1.1s linear infinite;
	}

	.marquee {
		position: relative;
		width: 100%;
		overflow: hidden;
	}

	.track {
		display: flex;
		align-items: center;
		gap: 16px;
		width: max-content;
		white-space: nowrap;
		animation: hint-slide 4s linear infinite;
	}

	.track > span {
		font-size: clamp(14px, 4vw, 20px);
		font-weight: 700;
		line-height: 1;
		color: var(--pop);
		text-shadow: 2px 2px 0 var(--btn-edge);
	}

	.drop-label {
		font-size: 16px;
	}

	.drop-ref .drop-label {
		color: var(--ref);
	}

	.drop-base .drop-label {
		color: var(--base);
	}

	.drop-hint {
		font-size: 16px;
		line-height: 1.5;
		color: var(--text-dim);
	}

	@media (max-width: 420px) {
		.drop {
			flex: none;
			width: 100%;
		}
	}
</style>
