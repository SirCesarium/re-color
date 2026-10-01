<div class="palette" aria-hidden="true">
	<span class="sw sw-red"></span>
	<span class="sw sw-orange"></span>
	<span class="sw sw-yellow"></span>
	<span class="sw sw-green"></span>
	<span class="sw sw-aqua"></span>
	<span class="sw sw-blue"></span>
	<span class="sw sw-purple"></span>
</div>

<style>
	.palette {
		display: inline-flex;
		gap: 4px;
		margin-top: 16px;
	}

	.sw {
		width: 16px;
		height: 16px;
		border: 1px solid var(--border);
		transition: transform 100ms ease-out;
	}

	.sw:hover {
		transform: translateY(-4px);
	}

	.sw-red {
		background: var(--sw-red);
	}
	.sw-orange {
		background: var(--sw-orange);
	}
	.sw-yellow {
		background: var(--sw-yellow);
	}
	.sw-green {
		background: var(--sw-green);
	}
	.sw-aqua {
		background: var(--sw-aqua);
	}
	.sw-blue {
		background: var(--sw-blue);
	}
	.sw-purple {
		background: var(--sw-purple);
	}
</style>
