<script lang="ts">
	import { fade } from 'svelte/transition';

	let {
		text = null,
		placement = 'flow',
		arrow = 'up',
		onDismiss,
		class: className = ''
	}: {
		text?: string | null;
		placement?: 'above' | 'flow';
		arrow?: 'up' | 'down';
		onDismiss?: () => void;
		class?: string;
	} = $props();
</script>

{#if text}
	<p
		class="hint pointer-events-none relative m-0 self-center whitespace-nowrap border-2 border-btn-edge bg-panel px-3 py-2 text-base leading-none text-text shadow-[3px_3px_0_var(--shadow)] {className}"
		class:interactive={onDismiss !== undefined}
		class:above={placement === 'above'}
		class:down-arrow={placement === 'above' || arrow === 'down'}
		role="status"
		out:fade={{ duration: 250 }}
	>
		<span>{text}</span>
		{#if onDismiss}
			<button
				class="dismiss"
				type="button"
				aria-label="Dismiss help"
				onclick={onDismiss}
			>
				×
			</button>
		{/if}
		<span class="tail"></span>
	</p>
{/if}

<style>
	.hint {
		animation: hint-in 200ms ease-out;
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

	.hint.interactive > span:first-child {
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
