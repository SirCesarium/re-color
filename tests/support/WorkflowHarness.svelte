<script lang="ts">
	import { untrack } from 'svelte';
	import { createRecolorWorkflow } from '../../src/lib/state/workflow/store.svelte.ts';

	let {
		onReady
	}: {
		onReady: (workflow: ReturnType<typeof createRecolorWorkflow>) => void;
	} = $props();

	// createRecolorWorkflow registers lifecycle effects (onMount/onDestroy), so
	// it only works inside a mounted component — which is exactly what this
	// harness provides. onReady hands the live workflow back to the test; it is
	// read once here, on purpose, so the stable callback is not tracked.
	const workflow = createRecolorWorkflow();

	untrack(() => onReady(workflow));
</script>

<div data-testid="busy">{workflow.state.busy ? 'busy' : 'idle'}</div>
