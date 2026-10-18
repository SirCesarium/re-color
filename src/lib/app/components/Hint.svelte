<script lang="ts">
	import { fade } from 'svelte/transition';
	import { t } from 'svelte-i18n';
	import Typography from '#app/components/Typography.svelte';

	let {
		text = null,
		placement = 'flow',
		arrow = 'up',
		error = false,
		hintsEnabled = true,
		onDismiss,
		tailOffset,
		class: className = ''
	}: {
		text?: string | null;
		placement?: 'above' | 'flow';
		arrow?: 'up' | 'down';
		error?: boolean;
		hintsEnabled?: boolean;
		onDismiss?: () => void;
		tailOffset?: string;
		class?: string;
	} = $props();

	// The widget wires in the help-hints preference; errors are status feedback,
	// so they show even when help hints are off.
	const visible = $derived(Boolean(text) && (error || hintsEnabled));

	const isDownArrow = $derived(placement === 'above' || arrow === 'down');
</script>

{#if visible}
	<div
		class="pointer-events-none relative self-center border-2 border-btn-edge bg-panel px-3 py-2 shadow-[3px_3px_0_var(--shadow)] max-w-full whitespace-normal text-balance {placement === 'above' ? 'absolute bottom-[calc(100%+12px)] left-0 right-0 w-max mx-auto animate-[hint-in-above_200ms_ease-out]' : 'animate-[hint-in_200ms_ease-out]'} {onDismiss !== undefined ? 'pointer-events-auto flex items-start gap-2' : ''} {className}"
		role="status"
		out:fade={{ duration: 250 }}
	>
		<Typography as="span" variant="body" class="{onDismiss !== undefined ? 'flex-1' : ''} leading-none">{text}</Typography>
		{#if onDismiss}
			<button
				class="shrink-0 border-0 bg-transparent px-0.5 py-0 text-inherit cursor-pointer font-[inherit] leading-none"
				type="button"
				aria-label={$t('hint.dismiss')}
				onclick={onDismiss}
			>
				&times;
			</button>
		{/if}
		<span
			class="absolute border-[6px] border-transparent {tailOffset ? '' : 'left-1/2 -translate-x-1/2'} {isDownArrow ? 'top-full border-t-btn-edge' : 'bottom-full border-b-btn-edge'}"
			style={tailOffset ? `left: ${tailOffset}` : ''}
		></span>
	</div>
{/if}
