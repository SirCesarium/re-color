<script lang="ts">
	import { fade } from 'svelte/transition';

	let {
		text = null,
		placement = 'flow'
	}: {
		text?: string | null;
		placement?: 'above' | 'flow';
	} = $props();
</script>

{#if text}
	<p
		class="hint"
		class:above={placement === 'above'}
		role="status"
		out:fade={{ duration: 250 }}
	>{text}<span class="tail"></span></p>
{/if}

<style>
	.hint {
		position: relative;
		margin: 0;
		align-self: center;
		padding: 8px 12px;
		background: var(--panel);
		border: 2px solid var(--btn-edge);
		box-shadow: 3px 3px 0 var(--shadow);
		color: var(--text);
		font-size: 16px;
		line-height: 1;
		white-space: nowrap;
		pointer-events: none;
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

	.tail {
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 6px solid transparent;
		border-bottom-color: var(--btn-edge);
	}

	.hint.above .tail {
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
