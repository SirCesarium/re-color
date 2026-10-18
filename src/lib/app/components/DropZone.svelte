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

	const hoverColor = $derived(
		variant === 'ref' ? 'hover:text-ref' : 'hover:text-sprite-base'
	);
	const accentColor = $derived(
		variant === 'ref' ? 'var(--ref)' : 'var(--sprite-base)'
	);
	const tagColor = $derived(
		variant === 'ref' ? 'text-ref' : 'text-sprite-base'
	);

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
	class="relative flex aspect-square h-auto flex-1 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden bg-panel px-3 text-center text-border-dash transition-[color,background-color] duration-120 ease-out drop-pattern hover:animate-[ants_500ms_linear_infinite] hover:bg-panel-hover has-[input:focus-visible]:shadow-[0_0_0_2px_var(--btn-edge)] max-[420px]:w-full max-[420px]:flex-none {hoverColor} {preview !== null ? 'bg-panel-sunken' : ''}"
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
			class="absolute right-1 bottom-1 left-1 z-10 border border-(--sw-red) bg-panel px-2 py-1 text-xs text-(--sw-red)"
			role="alert"
		>
			{$t(error)}
		</span>
	{/if}

	{#if dragging}
		<span
			class="pointer-events-none absolute inset-0 flex items-center overflow-hidden bg-panel"
			aria-hidden="true"
		>
			<span
				class="absolute inset-0 opacity-30 animate-[hint-drift_1.1s_linear_infinite]"
				style="background: conic-gradient({accentColor} 0 25%, transparent 0 50%, {accentColor} 0 75%, transparent 0) 0 0 / var(--checker-size) var(--checker-size)"
			></span>
			<span class="relative w-full overflow-hidden">
				<span class="flex w-max items-center gap-4 whitespace-nowrap animate-[hint-slide_4s_linear_infinite]">
					{#each Array(6) as _, i (i)}
						<span class="text-[clamp(14px,4vw,20px)] font-bold leading-none text-pop [text-shadow:2px_2px_0_var(--btn-edge)]">{$t('dropzone.dropIt')}</span>
					{/each}
				</span>
			</span>
		</span>
	{:else if preview}
		<span class="pointer-events-none absolute inset-0 checker-pattern opacity-50" aria-hidden="true"></span>
		<img
			class="pointer-events-none relative h-full w-full object-contain [image-rendering:pixelated]"
			src={preview}
			alt=""
		/>
		<span
			class="pointer-events-none absolute top-1.5 left-1.5 border border-border bg-panel px-1.5 py-1 text-base leading-none {tagColor}"
		>
			{label}
		</span>
	{:else}
		<Typography as="span" variant="control-label" class={tagColor}>{label}</Typography>
		<Typography as="span" variant="control-hint">{hint}</Typography>
	{/if}
</label>
