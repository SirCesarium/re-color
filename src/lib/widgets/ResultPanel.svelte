<section class="result-wrap" aria-label="Result">
	<span class="result-title">Result</span>
	<div class="result">
		<div class="checker"></div>
		<span class="result-hint">No result yet</span>
	</div>
</section>

<style>
	@keyframes drift {
		to {
			background-position: 16px 16px;
		}
	}

	.result-wrap {
		display: flex;
		flex-direction: column;
		gap: 8px;
		width: 100%;
		max-width: 480px;
		animation: rise 380ms ease-out 240ms backwards;
	}

	.result-title {
		font-size: 16px;
		color: var(--ok);
	}

	.result {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 1;
		height: auto;
		background: var(--panel-sunken);
		border: 1px solid var(--border);
		overflow: hidden;
	}

	.checker {
		position: absolute;
		inset: 0;
		background:
			conic-gradient(
				var(--panel) 0 25%,
				transparent 0 50%,
				var(--panel) 0 75%,
				transparent 0
			) 0 0 / 16px 16px;
		opacity: 0.35;
	}

	.result:hover .checker {
		animation: drift 4s linear infinite;
	}

	.result-hint {
		position: relative;
		font-size: 16px;
		line-height: 1.5;
		color: var(--text);
		background: var(--panel-sunken);
		border: 1px solid var(--border);
		padding: 8px 16px;
	}

	@media (min-width: 900px) {
		.result-wrap {
			grid-column: 2;
			grid-row: 1 / span 3;
			align-self: center;
			justify-self: stretch;
		}
	}
</style>
