<script lang="ts">
	import DropZone from "#lib/components/DropZone.svelte";

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
	aria-label="Images"
>
	<DropZone
		label="Palette"
		hint="Extract colors from this palette"
		variant="ref"
		bind:file={palette}
	/>
	<DropZone
		label="Sprite"
		hint="Apply the palette to this sprite"
		variant="base"
		bind:file={sprite}
	/>
</section>
