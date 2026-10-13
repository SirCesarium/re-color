<script lang="ts">
	import { t } from 'svelte-i18n';
	import Typography from '#app/components/Typography.svelte';

	let {
		label,
		hint,
		variant,
		validate,
		file = $bindable(null)
	}: {
		label: string;
		hint: string;
		variant: 'ref' | 'base';
		validate: (candidate: File) => Promise<string | null>;
		file: File | null;
	} = $props();

	let preview = $state<string | null>(null);
	let dragging = $state(false);
	let error = $state<string | null>(null);
	let selectionId = 0;
	let previewedFile: File | null = null;

	$effect(() => {
		const url = preview;
		return () => {
			if (url) URL.revokeObjectURL(url);
		};
	});

	$effect(() => {
		const currentFile = file;
		if (currentFile === previewedFile) return;

		selectionId++;
		previewedFile = currentFile;
		preview = currentFile ? URL.createObjectURL(currentFile) : null;
		error = null;
	});

	// The widget injects the acceptance rules and translates any failure into a
	// message key; this zone only runs the check and renders the outcome.
	async function load(candidate: File | undefined) {
		if (!candidate) return;

		const id = ++selectionId;
		error = null;

		let messageKey: string | null;

		try {
			messageKey = await validate(candidate);
		} catch {
			messageKey = 'dropzone.readFailed';
		}

		if (id !== selectionId) return;

		error = messageKey;

		if (messageKey === null) file = candidate;
	}

	function onInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const candidate = input.files?.[0];
		input.value = '';
		void load(candidate);
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
	class="drop drop-{variant} relative flex aspect-square h-auto flex-1 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden bg-panel px-3 text-center text-border-dash transition-[color,background-color] duration-[120ms] ease-out max-[420px]:w-full max-[420px]:flex-none"
	class:dragging
	class:filled={preview !== null}
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
>
	<input
		class="sr-only"
		type="file"
		accept="image/png,.png"
		aria-label={$t('dropzone.upload', { values: { label } })}
		onchange={onInput}
	/>

	{#if error}
		<span
			class="absolute right-1 bottom-1 left-1 z-10 border border-[var(--sw-red)] bg-panel px-2 py-1 text-xs text-[var(--sw-red)]"
			role="alert"
		>
			{$t(error)}
		</span>
	{/if}

	{#if dragging}
		<span
			class="hint-overlay pointer-events-none absolute inset-0 flex items-center overflow-hidden bg-panel"
			aria-hidden="true"
		>
			<span class="hint-checker"></span>
			<span class="relative w-full overflow-hidden">
				<span class="track flex w-max items-center gap-4 whitespace-nowrap">
					{#each Array(6) as _, i (i)}
						<span class="text-[clamp(14px,4vw,20px)]">{$t('dropzone.dropIt')}</span>
					{/each}
				</span>
			</span>
		</span>
	{:else if preview}
		<span class="checker pointer-events-none absolute inset-0" aria-hidden="true"></span>
		<img
			class="relative h-full w-full object-contain [image-rendering:pixelated] pointer-events-none"
			src={preview}
			alt=""
		/>
		<span
			class="tag pointer-events-none absolute top-[6px] left-[6px] border border-border bg-panel px-1.5 py-1 text-base leading-none"
		>
			{label}
		</span>
	{:else}
		<Typography as="span" variant="control-label" class="drop-label">{label}</Typography>
		<Typography as="span" variant="control-hint">{hint}</Typography>
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

	.drop {
		background-image:
			repeating-linear-gradient(90deg, currentColor 0 8px, transparent 8px 16px),
			repeating-linear-gradient(90deg, currentColor 0 8px, transparent 8px 16px),
			repeating-linear-gradient(180deg, currentColor 0 8px, transparent 8px 16px),
			repeating-linear-gradient(180deg, currentColor 0 8px, transparent 8px 16px);
		background-size: 16px 2px, 16px 2px, 2px 16px, 2px 16px;
		background-position: 0 0, 0 100%, 0 0, 100% 0;
		background-repeat: repeat-x, repeat-x, repeat-y, repeat-y;
	}

	.drop:hover {
		animation: ants 500ms linear infinite;
	}

	.drop-ref:hover {
		color: var(--ref);
		background-color: var(--panel-hover);
	}

	.drop-base:hover {
		color: var(--sprite-base);
		background-color: var(--panel-hover);
	}

	.drop:has(input:focus-visible) {
		box-shadow: 0 0 0 2px var(--btn-edge);
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
			) 0 0 / var(--checker-size) var(--checker-size);
		opacity: 0.5;
		pointer-events: none;
	}

	.drop-ref .tag {
		color: var(--ref);
	}

	.drop-base .tag {
		color: var(--sprite-base);
	}

	.drop-ref {
		--zone-accent: var(--ref);
	}

	.drop-base {
		--zone-accent: var(--sprite-base);
	}

	.track {
		animation: hint-slide 4s linear infinite;
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
			) 0 0 / var(--checker-size) var(--checker-size);
		opacity: 0.3;
		animation: hint-drift 1.1s linear infinite;
	}

	.track > span {
		font-weight: 700;
		line-height: 1;
		color: var(--pop);
		text-shadow: 2px 2px 0 var(--btn-edge);
	}

	.drop-ref :global(.drop-label) {
		color: var(--ref);
	}

	.drop-base :global(.drop-label) {
		color: var(--sprite-base);
	}

</style>
