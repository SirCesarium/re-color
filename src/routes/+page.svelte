<script lang="ts">
	import Hero from "#lib/widgets/Hero.svelte";
	import ImageInputs from "#lib/widgets/ImageInputs.svelte";
	import ResultPanel from "#lib/widgets/ResultPanel.svelte";
	import Button from "#lib/components/Button.svelte";
	import ButtonGroup from "#lib/components/ButtonGroup.svelte";
	import Hint from "#lib/components/Hint.svelte";
	import Typography from "#lib/components/Typography.svelte";
	import { MAPPING_OPTIONS } from "#lib/config/recolor.ts";
	import { createRecolorWorkflow } from "#lib/state/recolor-workflow.svelte.ts";
	import { t } from "svelte-i18n";

	const workflow = createRecolorWorkflow();

	const mappingOptions = $derived(
		MAPPING_OPTIONS.map((option) => ({
			value: option.value,
			label: $t(option.labelKey),
		})),
	);

	function confirmClearFormData() {
		if (confirm($t("home.clearFormConfirm"))) {
			workflow.clearFormData();
		}
	}
</script>

<svelte:head>
	<title>{$t("home.title")}</title>
	<meta name="description" content={$t("home.description")} />
	<link rel="canonical" href="https://recolor.pages.dev/" />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content="re::color" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:url" content="https://recolor.pages.dev/" />
	<meta property="og:title" content="re::color" />
	<meta property="og:description" content={$t("home.ogDescription")} />
	<meta property="og:image" content="https://recolor.pages.dev/og.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={$t("meta.ogAlt")} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content="re::color" />
	<meta name="twitter:description" content={$t("home.ogDescription")} />
	<meta name="twitter:image" content="https://recolor.pages.dev/og.png" />
	<meta name="twitter:image:alt" content={$t("meta.ogAlt")} />
</svelte:head>

<main
	class="box-border flex w-full flex-1 flex-col items-center justify-center gap-8 px-4 py-12 min-[900px]:mx-auto min-[900px]:grid min-[900px]:max-w-[1040px] min-[900px]:grid-cols-[1fr_1fr] min-[900px]:content-center min-[900px]:justify-items-start min-[900px]:gap-x-16 min-[900px]:gap-y-8"
>
	<Hero bind:colors={workflow.state.colors} />
	<ImageInputs
		bind:palette={workflow.state.palette}
		bind:sprite={workflow.state.sprite}
	/>
	<div
		class="animate-[rise_380ms_ease-out_160ms_backwards] flex w-full max-w-[480px] flex-col gap-4 min-[900px]:col-start-1 min-[900px]:justify-self-stretch"
	>
		<button
			class="self-start text-xs text-text-dim underline decoration-dotted underline-offset-4 hover:text-text"
			type="button"
			onclick={confirmClearFormData}
		>
			{$t("home.clearForm")}
		</button>
		<Button
			disabled={!workflow.state.busy &&
				(!workflow.ready || workflow.noActiveColors)}
			busy={workflow.state.busy}
			cancelOnBusy
			progress={workflow.state.progress}
			onclick={workflow.handleRecolor}
		>
			{$t("home.recolor")}
		</Button>
		<Hint
		error={workflow.buttonHintIsError}
		text={workflow.buttonHint ? $t(workflow.buttonHint) : null}
	/>
	</div>
	<div
		class="flex w-full max-w-[480px] flex-col gap-4 min-[900px]:col-start-2 min-[900px]:row-start-1 min-[900px]:row-end-[span_3] min-[900px]:self-center min-[900px]:justify-self-stretch"
	>
		<section
			class="animate-[rise_380ms_ease-out_200ms_backwards] flex w-full max-w-[480px] flex-col gap-2"
			aria-label={$t("home.mappingAria")}
		>
			<Typography as="span" variant="section-label">{$t("home.mappingSection")}</Typography>
			<ButtonGroup
				bind:value={workflow.state.mapping}
				options={mappingOptions}
				label={$t("home.mappingAria")}
			/>
		</section>
		<ResultPanel
			imageUrl={workflow.state.result?.previewUrl ?? null}
			spriteFile={workflow.state.sprite}
			excludedPixels={workflow.state.excludedPixels}
			onTogglePixel={workflow.toggleExcludedPixel}
			onSetPixelExclusion={workflow.setPixelExclusion}
			onDownload={workflow.downloadResult}
		/>
	</div>
</main>
