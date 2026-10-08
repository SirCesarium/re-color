<script lang="ts">
	import DropZone from "#lib/components/DropZone.svelte";
	import { t } from 'svelte-i18n';

	let {
		palette = $bindable(null),
		sprite = $bindable(null),
	}: {
		palette: File | null;
		sprite: File | null;
	} = $props();
</script>

<section
	class="animate-[rise_380ms_ease-out_80ms_backwards] flex w-full max-w-[480px] gap-4 max-[420px]:flex-col min-[900px]:col-start-1"
	aria-label={$t('inputs.aria')}
>
	<DropZone
		label={$t('inputs.palette')}
		hint={$t('inputs.paletteHint')}
		variant="ref"
		bind:file={palette}
	/>
	<DropZone
		label={$t('inputs.sprite')}
		hint={$t('inputs.spriteHint')}
		variant="base"
		bind:file={sprite}
	/>
</section>
