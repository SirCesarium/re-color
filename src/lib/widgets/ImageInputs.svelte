<script lang="ts">
	import { t } from 'svelte-i18n';
	import { validateImageFile } from '#lib';
	import DropZone from '#lib/components/DropZone.svelte';
	import { LocalizedError } from '#lib/i18n/localized-error.ts';

	let {
		palette = $bindable(null),
		sprite = $bindable(null)
	}: {
		palette: File | null;
		sprite: File | null;
	} = $props();

	// The domain rejects with a message key; the widget translates any failure
	// into the key DropZone should render, so the component stays dumb.
	async function acceptImage(candidate: File): Promise<string | null> {
		try {
			await validateImageFile(candidate);

			return null;
		} catch (cause) {
			return cause instanceof LocalizedError
				? cause.messageId
				: 'dropzone.readFailed';
		}
	}
</script>

<section
	class="animate-[rise_380ms_ease-out_80ms_backwards] flex w-full max-w-[480px] gap-4 max-[420px]:flex-col min-[900px]:col-start-1"
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
