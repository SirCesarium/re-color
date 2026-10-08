<script lang="ts">
	import { onMount } from "svelte";
	import ButtonGroup from "#lib/components/ButtonGroup.svelte";
	import Dropdown from "#lib/components/Dropdown.svelte";
	import PixelSlider from "#lib/components/PixelSlider.svelte";
	import SettingRow from "#lib/components/SettingRow.svelte";
	import SwitchButton from "#lib/components/SwitchButton.svelte";
	import Typography from "#lib/components/Typography.svelte";
	import { MAPPING_OPTIONS, MAPPING_STORAGE_KEY } from "#lib/config/recolor.ts";
	import { localeFromNavigator, setLocale } from "#lib/i18n/index.ts";
	import { LOCALE_LABELS, SUPPORTED_LOCALES, type Locale, type MessageKey } from "#lib/i18n/locales.ts";
	import { LocalizedError } from "#lib/i18n/localized-error.ts";
	import {
		APP_SETTINGS_KEY,
		DEFAULT_APP_SETTINGS,
		clearSavedAppData,
		clearWorkspace,
		exportAppSettings,
		importAppSettings,
		loadWorkspace,
		parseAppSettings,
		saveWorkspace,
	} from "#lib/state/app-settings.ts";
	import type { AppSettings } from "#lib/state/app-settings.ts";
	import { hintsEnabled } from "#lib/state/hints.ts";
	import { t } from "svelte-i18n";

	let settings = $state<AppSettings>({ ...DEFAULT_APP_SETTINGS });
	let error = $state<{ id: MessageKey; values?: Record<string, string | number> } | null>(null);
	let loading = $state(true);

	const mappingOptions = $derived(
		MAPPING_OPTIONS.map((option) => ({ value: option.value, label: $t(option.labelKey) })),
	);
	const localeOptions = $derived(
		SUPPORTED_LOCALES.map((value) => ({ value, label: LOCALE_LABELS[value] })),
	);

	onMount(() => {
		try {
			settings = parseAppSettings(localStorage.getItem(APP_SETTINGS_KEY), localeFromNavigator());
		} catch (cause) {
			console.error("Could not read saved app settings", cause);
			error = { id: "settings.errorLoad" };
		}

		document.documentElement.classList.toggle(
			"animations-disabled",
			!settings.animationsEnabled,
		);
		loading = false;

		return () => {
			document.documentElement.classList.remove("animations-disabled");
		};
	});

	function persistSettings() {
		try {
			localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
			error = null;
		} catch (cause) {
			console.error("Could not save app settings", cause);
			error = { id: "settings.errorSave" };
		}
	}

	function updateLocale(locale: Locale) {
		settings.locale = locale;
		setLocale(locale);
		persistSettings();
	}

	function updateAnimations(enabled: boolean) {
		settings.animationsEnabled = enabled;
		document.documentElement.classList.toggle(
			"animations-disabled",
			!enabled,
		);
		persistSettings();
	}

	function updateHints(enabled: boolean) {
		settings.hintsEnabled = enabled;
		hintsEnabled.set(enabled);
		persistSettings();
	}

	function updateAutoRecolor(enabled: boolean) {
		settings.autoRecolor = enabled;
		persistSettings();
	}

	async function updatePersistWorkspace(enabled: boolean) {
		settings.persistWorkspace = enabled;
		persistSettings();

		if (!enabled) {
			try {
				await clearWorkspace();
				error = null;
			} catch (cause) {
				console.error(
					"Could not clear saved workspace after disabling persistence",
					cause,
				);
				error = { id: "settings.errorWorkspaceClear" };
			}
		}
	}

	function updateMaxPaletteColors(maxColors: number) {
		settings.maxPaletteColors = maxColors;
		persistSettings();
	}

	function exportSettings() {
		const blob = new Blob([exportAppSettings(settings)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");

		link.href = url;
		link.download = "re-color-settings.json";
		link.click();

		setTimeout(() => URL.revokeObjectURL(url), 0);
	}

	async function importSettings(file: File | undefined) {
		if (!file) return;

		try {
			const importedSettings = importAppSettings(await file.text());
			settings = importedSettings;
			setLocale(importedSettings.locale);
			hintsEnabled.set(importedSettings.hintsEnabled);
			document.documentElement.classList.toggle(
				"animations-disabled",
				!importedSettings.animationsEnabled,
			);
			persistSettings();

			if (!importedSettings.persistWorkspace) await clearWorkspace();
		} catch (cause) {
			console.error("Could not import settings file", cause);
			error =
				cause instanceof LocalizedError
					? { id: cause.messageId, values: cause.values }
					: { id: "settings.errorImport" };
		}
	}

	function handleImportSelection(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		void importSettings(input.files?.[0]);
		input.value = "";
	}

	async function updateDefaultMapping(
		mapping: AppSettings["defaultMapping"],
	) {
		settings.defaultMapping = mapping;
		persistSettings();

		try {
			const workspace = await loadWorkspace();
			if (workspace) await saveWorkspace({ ...workspace, mapping });
		} catch (cause) {
			console.error(
				"Could not save default mapping to current workspace",
				cause,
			);
			error = { id: "settings.errorMappingSave" };
		}
	}

	function applyDefaults() {
		settings = { ...DEFAULT_APP_SETTINGS };
		setLocale(DEFAULT_APP_SETTINGS.locale);
		hintsEnabled.set(DEFAULT_APP_SETTINGS.hintsEnabled);
		document.documentElement.classList.remove("animations-disabled");
	}

	function resetSettings() {
		if (!confirm($t("settings.resetConfirm"))) return;

		applyDefaults();
		localStorage.removeItem(MAPPING_STORAGE_KEY);
		persistSettings();
	}

	async function handleClearAppData() {
		if (!confirm($t("settings.clearConfirm"))) return;

		try {
			await clearSavedAppData();
			applyDefaults();
			persistSettings();
		} catch (cause) {
			console.error("Could not clear saved app data", cause);
			error = { id: "settings.errorClear" };
		}
	}
</script>

<svelte:head>
	<title>{$t("settings.metaTitle")}</title>
	<meta
		name="description"
		content={$t("settings.metaDescription")}
	/>
	<link rel="canonical" href="https://recolor.pages.dev/settings" />
</svelte:head>

<main class="box-border flex w-full flex-1 flex-col items-center gap-8 px-3 py-12 sm:px-4">
	{#if !loading}
		<section class="flex w-full max-w-[860px] flex-col gap-8" aria-labelledby="settings-title">
			<Typography id="settings-title" as="h1" variant="page-title" class="m-0">
				{$t("settings.title")}
			</Typography>

			<div class="grid gap-8">
				<div class="grid gap-2">
					<Typography as="h2" variant="section-label" class="m-0">
						{$t("settings.groupInterface")}
					</Typography>
					<div class="grid">
						<SettingRow title={$t("settings.languageTitle")} hint={$t("settings.languageDesc")}>
							{#snippet control()}
								<Dropdown
									class="w-full min-[640px]:w-[200px]"
									value={settings.locale}
									options={localeOptions}
									label={$t("settings.languageAria")}
									onchange={updateLocale}
								/>
							{/snippet}
						</SettingRow>
						<SettingRow title={$t("settings.animationsTitle")} hint={$t("settings.animationsDesc")}>
							{#snippet control()}
								<SwitchButton
									checked={settings.animationsEnabled}
									label={$t("settings.animationsTitle")}
									onchange={updateAnimations}
								/>
							{/snippet}
						</SettingRow>
						<SettingRow title={$t("settings.hintsTitle")} hint={$t("settings.hintsDesc")}>
							{#snippet control()}
								<SwitchButton
									checked={settings.hintsEnabled}
									label={$t("settings.hintsTitle")}
									onchange={updateHints}
								/>
							{/snippet}
						</SettingRow>
					</div>
				</div>

				<div class="grid gap-2">
					<Typography as="h2" variant="section-label" class="m-0">
						{$t("settings.groupRecolor")}
					</Typography>
					<div class="grid">
						<SettingRow title={$t("settings.autoRecolorTitle")} hint={$t("settings.autoRecolorDesc")}>
							{#snippet control()}
								<SwitchButton
									checked={settings.autoRecolor}
									label={$t("settings.autoRecolorTitle")}
									onchange={updateAutoRecolor}
								/>
							{/snippet}
						</SettingRow>
						<SettingRow
							stacked
							title={$t("settings.maxColorsTitle")}
							hint={$t("settings.maxColorsDesc")}
						>
							{#snippet control()}
								<PixelSlider
									value={settings.maxPaletteColors}
									min={1}
									max={256}
									label={$t("settings.maxColorsTitle")}
									showLabel={false}
									onchange={updateMaxPaletteColors}
								/>
							{/snippet}
						</SettingRow>
						<SettingRow stacked title={$t("settings.mappingTitle")} hint={$t("settings.mappingDesc")}>
							{#snippet control()}
								<ButtonGroup
									value={settings.defaultMapping}
									options={mappingOptions}
									label={$t("settings.mappingAria")}
									onchange={updateDefaultMapping}
								/>
							{/snippet}
						</SettingRow>
					</div>
				</div>

				<div class="grid gap-2">
					<Typography as="h2" variant="section-label" class="m-0">
						{$t("settings.groupData")}
					</Typography>
					<div class="grid">
						<SettingRow title={$t("settings.persistTitle")} hint={$t("settings.persistDesc")}>
							{#snippet control()}
								<SwitchButton
									checked={settings.persistWorkspace}
									label={$t("settings.persistTitle")}
									onchange={updatePersistWorkspace}
								/>
							{/snippet}
						</SettingRow>
						<SettingRow stacked title={$t("settings.backupTitle")} hint={$t("settings.backupDesc")}>
							{#snippet control()}
								<div class="flex flex-wrap gap-3">
									<button
										class="inline-flex min-h-11 cursor-pointer items-center justify-center border-2 border-btn-edge bg-panel px-3 py-1.5 text-base text-text shadow-[3px_3px_0_var(--btn-shadow)] transition-colors hover:bg-panel-hover"
										type="button"
										onclick={exportSettings}
									>
										{$t("settings.export")}
									</button>
									<label
										class="inline-flex min-h-11 cursor-pointer items-center justify-center border-2 border-btn-edge bg-panel px-3 py-1.5 text-base text-text shadow-[3px_3px_0_var(--btn-shadow)] transition-colors hover:bg-panel-hover focus-within:shadow-[0_0_0_2px_var(--btn-edge),3px_3px_0_var(--btn-shadow)]"
									>
										{$t("settings.import")}
										<input
											class="sr-only"
											type="file"
											accept="application/json,.json"
											aria-label={$t("settings.importAria")}
											onchange={handleImportSelection}
										/>
									</label>
								</div>
							{/snippet}
						</SettingRow>
						<SettingRow title={$t("settings.resetTitle")} hint={$t("settings.resetDesc")}>
							{#snippet control()}
								<button
									class="min-h-11 cursor-pointer border-2 border-btn-edge bg-panel px-3 py-2 text-base text-text shadow-[3px_3px_0_var(--btn-shadow)] transition-colors hover:bg-panel-hover"
									type="button"
									onclick={resetSettings}
								>
									{$t("settings.resetBtn")}
								</button>
							{/snippet}
						</SettingRow>
						<SettingRow title={$t("settings.clearTitle")} hint={$t("settings.clearDesc")}>
							{#snippet control()}
								<button
									class="min-h-11 cursor-pointer border-2 border-[var(--sw-red)] bg-panel px-3 py-2 text-base text-[var(--sw-red)] shadow-[3px_3px_0_var(--btn-shadow)] transition-colors hover:bg-[var(--sw-red)] hover:text-panel"
									type="button"
									onclick={handleClearAppData}
								>
									{$t("settings.clearBtn")}
								</button>
							{/snippet}
						</SettingRow>
					</div>
				</div>
			</div>
		</section>
	{/if}

	{#if error}
		<Typography
			as="p"
			variant="body"
			class="w-full max-w-[860px] text-[var(--sw-red)]"
			role="alert"
		>
			{$t(error.id, { values: error.values })}
		</Typography>
	{/if}
</main>
