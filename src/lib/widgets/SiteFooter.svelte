<script lang="ts">
	import { resolve } from '$app/paths';
	import Link from '#lib/components/Link.svelte';
</script>

<footer class="flex gap-6 pb-6 text-base">
	<Link href={resolve('/privacy')}>Privacy</Link>
	<Link
		href="https://github.com/SirCesarium/re-color"
		variant="muted"
		target="_blank"
		rel="noreferrer"
	>Source on GitHub</Link>
</footer>
