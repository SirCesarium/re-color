<button class="run" type="button">recolor!</button>

<style>
	.run {
		font-family: inherit;
		font-size: 16px;
		font-weight: 700;
		width: 100%;
		max-width: 480px;
		padding: 12px 32px;
		color: var(--btn-fg);
		background: var(--btn-bg);
		border: 2px solid var(--btn-edge);
		box-shadow: 4px 4px 0 var(--btn-shadow);
		cursor: pointer;
		animation: rise 380ms ease-out 160ms backwards;
		transition:
			transform 80ms ease-out,
			box-shadow 80ms ease-out,
			background-color 120ms linear;
	}

	.run:hover {
		background: color-mix(in srgb, var(--btn-bg) 85%, white);
		transform: translateY(-2px);
		box-shadow: 6px 6px 0 var(--btn-shadow);
	}

	.run:active {
		transform: translate(4px, 4px);
		box-shadow: 0 0 0 var(--btn-shadow);
	}

	.run:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 3px;
	}

	@media (min-width: 900px) {
		.run {
			grid-column: 1;
			justify-self: stretch;
		}
	}
</style>
