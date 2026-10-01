<script lang="ts">
	import DropZone from '#lib/components/DropZone.svelte';
</script>

<section class="inputs" aria-label="Images">
	<DropZone label="Palette" hint="Color source" variant="ref" />
	<DropZone label="Sprite" hint="Recolor this sprite" variant="base" />
</section>

<style>
	.inputs {
		display: flex;
		gap: 16px;
		width: 100%;
		max-width: 480px;
		animation: rise 380ms ease-out 80ms backwards;
	}

	@media (max-width: 420px) {
		.inputs {
			flex-direction: column;
		}
	}

	@media (min-width: 900px) {
		.inputs {
			grid-column: 1;
		}
	}
</style>
