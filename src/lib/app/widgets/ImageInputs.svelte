<script lang="ts">
	import { t } from 'svelte-i18n';
	import DropZone from '#app/components/DropZone.svelte';
	import type { MessageKey } from '#app/i18n/locales.ts';
	import { type ValidationCode, ValidationError, validateImageFile } from '#lib';

	let {
		palette = $bindable(null),
		sprite = $bindable(null)
	}: {
		palette: File | null;
		sprite: File | null;
	} = $props();

	// The domain reports why an upload failed as a plain code; turning codes
	// into words is this layer's job, so the table lives here, not down there.
	const VALIDATION_KEYS: Record<ValidationCode, MessageKey> = {
		tooLarge: 'validation.tooLarge',
		notPng: 'validation.notPng',
		empty: 'validation.empty',
		tooBig: 'validation.tooBig'
	};

	// DropZone renders whatever key we hand back, so the widget owns the
	// translation of domain failures into a message.
	async function acceptImage(candidate: File): Promise<string | null> {
		try {
			await validateImageFile(candidate);

			return null;
		} catch (cause) {
			return cause instanceof ValidationError ? VALIDATION_KEYS[cause.code] : 'dropzone.readFailed';
		}
	}
</script>

<section
	class="flex w-full max-w-120 animate-[rise_380ms_ease-out_80ms_backwards] gap-4 max-[420px]:flex-col min-[900px]:col-start-1"
	aria-label={$t('inputs.aria')}
>
	<DropZone
		label={$t('inputs.palette')}
		hint={$t('inputs.paletteHint')}
		variant="ref"
		validate={acceptImage}
		bind:file={palette}
	/>
	<DropZone
		label={$t('inputs.sprite')}
		hint={$t('inputs.spriteHint')}
		variant="base"
		validate={acceptImage}
		bind:file={sprite}
	/>
</section>
