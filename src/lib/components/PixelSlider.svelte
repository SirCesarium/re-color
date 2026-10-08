<script lang="ts">
	let {
		value,
		min,
		max,
		label,
		onchange
	}: {
		value: number;
		min: number;
		max: number;
		label: string;
		onchange: (value: number) => void;
	} = $props();

	let progress = $derived(((value - min) / (max - min)) * 100);
	let inputId = $derived(
		`pixel-slider-${label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`
	);
	let draft = $state('');

	$effect(() => {
		draft = String(value);
	});

	function updateFromInput() {
		const next = Number(draft);
		if (Number.isInteger(next) && next >= min && next <= max) onchange(next);
	}

	function commitNumber() {
		const next = Number(draft);
		if (draft !== '' && Number.isInteger(next) && next >= min && next <= max) {
			onchange(next);
		} else {
			draft = String(value);
		}
	}
</script>

<div class="grid gap-2">
	<div class="flex items-center justify-between gap-3 text-xs text-text-dim">
		<label for={inputId}>{label}</label>
		<input
			class="box-border w-[72px] appearance-none border-2 border-btn-edge bg-panel-sunken px-2 py-[3px] text-center text-sm tabular-nums text-text shadow-[2px_2px_0_var(--btn-shadow)] focus-visible:outline-none"
			id="{inputId}-number"
			type="text"
			inputmode="numeric"
			pattern="[0-9]*"
			bind:value={draft}
			aria-label="{label} value"
			oninput={updateFromInput}
			onblur={commitNumber}
		/>
	</div>
	<input
		id={inputId}
		class="slider h-6 w-full cursor-pointer appearance-none bg-transparent"
		type="range"
		{min}
		{max}
		step="1"
		{value}
		aria-label={label}
		style:--progress="{progress}%"
		oninput={(event) => onchange(Number(event.currentTarget.value))}
	/>
	<div class="flex justify-between text-xs text-text-dim" aria-hidden="true">
		<span>{min}</span><span>{max}</span>
	</div>
</div>

<style>
	.slider::-webkit-slider-runnable-track {
		height: 10px;
		border: 2px solid var(--btn-edge);
		background:
			linear-gradient(var(--btn-bg), var(--btn-bg)) 0 0 / var(--progress) 100% no-repeat,
			var(--panel-sunken);
		box-shadow: 2px 2px 0 var(--btn-shadow);
	}

	.slider::-moz-range-track {
		height: 6px;
		border: 2px solid var(--btn-edge);
		background: var(--panel-sunken);
		box-shadow: 2px 2px 0 var(--btn-shadow);
	}

	.slider::-moz-range-progress {
		height: 6px;
		background: var(--btn-bg);
	}

	.slider::-webkit-slider-thumb {
		width: 18px;
		height: 20px;
		margin-top: -7px;
		appearance: none;
		border: 2px solid var(--btn-edge);
		border-radius: 0;
		background: var(--btn-fg);
		box-shadow: 2px 2px 0 var(--btn-shadow);
	}

	.slider::-moz-range-thumb {
		width: 14px;
		height: 16px;
		border: 2px solid var(--btn-edge);
		border-radius: 0;
		background: var(--btn-fg);
		box-shadow: 2px 2px 0 var(--btn-shadow);
	}
</style>
