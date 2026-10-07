<script lang="ts" generics="T extends string">
	let {
		options,
		value = $bindable<T>(),
		label,
		class: className = ''
	}: {
		options: readonly { value: T; label: string }[];
		value?: T;
		label: string;
		class?: string;
	} = $props();

	let index = $derived(options.findIndex((option) => option.value === value));
</script>

<div
	class="button-group {className}"
	role="group"
	aria-label={label}
	style:--option-count={options.length}
>
	<span class="pill" style:--i={index}></span>

	{#each options as option (option.value)}
		<button
			class="seg"
			class:on={value === option.value}
			type="button"
			aria-pressed={value === option.value}
			title={option.label}
			onclick={() => (value = option.value)}
		>
			<span class="label">{option.label}</span>
		</button>
	{/each}
</div>

<style>
	.button-group {
		position: relative;
		overflow: hidden;
		display: grid;
		grid-template-columns: repeat(var(--option-count), minmax(0, 1fr));
		background: var(--panel);
		border: 2px solid var(--btn-edge);
		box-shadow: 4px 4px 0 var(--btn-shadow);
	}

	.pill {
		position: absolute;
		top: 0;
		bottom: 0;
		left: calc(var(--i, 0) * 100% / var(--option-count));
		width: calc(100% / var(--option-count));
		background: var(--btn-bg);
		transition:
			left 320ms cubic-bezier(0.34, 1.56, 0.64, 1),
			top 320ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.seg {
		position: relative;
		z-index: 1;
		display: flex;
		min-width: 0;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 12px 4px;
		border: 0;
		border-left: 2px solid var(--btn-edge);
		background: transparent;
		color: var(--text-dim);
		cursor: pointer;
		transition:
			background-color 120ms linear,
			color 120ms linear;
	}

	.seg:first-of-type {
		border-left: 0;
	}

	.seg:hover {
		background: var(--panel-hover);
		color: var(--text);
	}

	.seg.on,
	.seg.on:hover {
		color: var(--btn-fg);
	}

	.seg.on:hover {
		background: transparent;
	}

	.seg:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -4px;
	}

	.label {
		min-width: 0;
		font-size: 16px;
		line-height: 1.2;
		text-align: center;
		overflow-wrap: break-word;
		transition: transform 120ms ease-out;
	}

	.seg.on .label {
		animation: pop 220ms ease-out;
	}

	.seg:active .label {
		transform: translateY(2px);
	}

	@keyframes pop {
		from {
			transform: scale(0.7);
		}
	}

	@media (max-width: 420px) {
		.button-group {
			grid-template-columns: 1fr;
		}

		.pill {
			left: 0;
			right: 0;
			bottom: auto;
			width: auto;
			top: calc(var(--i, 0) * 100% / var(--option-count));
			height: calc(100% / var(--option-count));
		}

		.seg {
			border-top: 2px solid var(--btn-edge);
			border-left: 0;
			padding: 12px 8px;
		}

		.seg:first-of-type {
			border-top: 0;
		}
	}
</style>
