<script lang="ts">
	import { fade } from 'svelte/transition';
	import Typography from '#lib/components/Typography.svelte';
	import { hintsEnabled } from '#lib/state/hints.ts';
	import { t } from 'svelte-i18n';

	let {
		text = null,
		placement = 'flow',
		arrow = 'up',
		error = false,
		onDismiss,
		class: className = ''
	}: {
		text?: string | null;
		placement?: 'above' | 'flow';
		arrow?: 'up' | 'down';
		error?: boolean;
		onDismiss?: () => void;
		class?: string;
	} = $props();

	// Errors are status feedback, so they ignore the help-hints preference.
	const visible = $derived(Boolean(text) && (error || $hintsEnabled));
</script>

{#if visible}
	<div
		class="hint pointer-events-none relative self-center border-2 border-btn-edge bg-panel px-3 py-2 shadow-[3px_3px_0_var(--shadow)] {className}"
		class:interactive={onDismiss !== undefined}
		class:above={placement === 'above'}
		class:down-arrow={placement === 'above' || arrow === 'down'}
		role="status"
		out:fade={{ duration: 250 }}
	>
		<Typography as="span" variant="body" class="hint-content leading-none">{text}</Typography>
		{#if onDismiss}
			<button
				class="dismiss"
				type="button"
				aria-label={$t('hint.dismiss')}
				onclick={onDismiss}
			>
				×
			</button>
		{/if}
		<span class="tail"></span>
	</div>
{/if}

<style>
	.hint {
		animation: hint-in 200ms ease-out;
		max-width: 100%;
		white-space: normal;
		text-wrap: balance;
	}

	.hint.above {
		position: absolute;
		bottom: calc(100% + 12px);
		left: 0;
		right: 0;
		width: max-content;
		margin-inline: auto;
		animation: hint-in-above 200ms ease-out;
	}

	.hint.interactive {
		pointer-events: auto;
		display: flex;
		align-items: flex-start;
		gap: 8px;
	}

	.hint.interactive :global(.hint-content) {
		flex: 1;
	}

	.dismiss {
		flex: none;
		padding: 0 2px;
		border: 0;
		background: transparent;
		color: inherit;
		cursor: pointer;
		font: inherit;
		line-height: 1;
	}

	.tail {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 6px solid transparent;
		border-bottom-color: var(--btn-edge);
	}

	.hint.down-arrow .tail {
		bottom: auto;
		top: 100%;
		border-bottom-color: transparent;
		border-top-color: var(--btn-edge);
	}

	@keyframes hint-in {
		from {
			opacity: 0;
			transform: translateY(-6px);
		}
	}

	@keyframes hint-in-above {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
	}
</style>
