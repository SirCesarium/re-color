<script lang="ts">
	import DropZone from '../../../src/lib/app/components/DropZone.svelte';

	let {
		validate
	}: {
		validate: (candidate: File) => Promise<string | null>;
	} = $props();

	// DropZone's file prop is $bindable, so a test can only observe whether the
	// zone accepted a drop through a bound parent — this harness is that parent.
	let file = $state<File | null>(null);
</script>

<DropZone label="Palette" hint="Reference image" variant="ref" {validate} bind:file />

<span data-testid="accepted">{file ? 'accepted' : 'empty'}</span>
