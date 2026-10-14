<script lang="ts">
	import { t } from 'svelte-i18n';
	import ButtonGroup from '#app/components/ButtonGroup.svelte';
	import Dropdown from '#app/components/Dropdown.svelte';
	import PixelSlider from '#app/components/PixelSlider.svelte';
	import SettingRow from '#app/components/SettingRow.svelte';
	import SwitchButton from '#app/components/SwitchButton.svelte';
	import Typography from '#app/components/Typography.svelte';
	import {
		LOCALE_LABELS,
		type Locale,
		type MessageKey,
		SUPPORTED_LOCALES
	} from '#app/i18n/locales.ts';
	import { LocalizedError } from '#app/i18n/localized-error.ts';
	import { type AppSettings } from '#app/state/settings/model.ts';
	import {
		clearSavedAppData,
		importAppSettings
	} from '#app/state/settings/repository.ts';
	import {
		replaceSettings,
		resetSettings as restoreDefaults,
		serializeSettings,
		settings,
		updateSetting
	} from '#app/state/settings/store.svelte.ts';
	import {
		clearWorkspace,
		loadWorkspace,
		saveWorkspace
	} from '#app/state/workspace.ts';
	import { MAPPING_OPTIONS } from '#core/recolor.ts';

	let error = $state<{
		id: MessageKey;
		values?: Record<string, string | number>;
	} | null>(null);

	const mappingOptions = $derived(
		MAPPING_OPTIONS.map(option => ({
			value: option.value,
			label: $t(option.labelKey)
		}))
	);
	const localeOptions = $derived(
		SUPPORTED_LOCALES.map(value => ({ value, label: LOCALE_LABELS[value] }))
	);

	/** Clears the banner after a successful save, or reports a failed one. */
	function saveOrReport(saved: boolean): void {
		error = saved ? null : { id: 'settings.errorSave' };
	}

	function updateLocale(locale: Locale): void {
		saveOrReport(updateSetting('locale', locale));
	}

	function updateAnimations(enabled: boolean): void {
		saveOrReport(updateSetting('animationsEnabled', enabled));
	}

	function updateHints(enabled: boolean): void {
		saveOrReport(updateSetting('hintsEnabled', enabled));
	}

	function updateAutoRecolor(enabled: boolean): void {
		saveOrReport(updateSetting('autoRecolor', enabled));
	}

	async function updatePersistWorkspace(enabled: boolean): Promise<void> {
		saveOrReport(updateSetting('persistWorkspace', enabled));

		if (enabled) return;

		try {
			await clearWorkspace();
			error = null;
		} catch (cause) {
			console.error(
				'Could not clear saved workspace after disabling persistence',
				cause
			);
			error = { id: 'settings.errorWorkspaceClear' };
		}
	}

	function updateMaxPaletteColors(maxColors: number): void {
		saveOrReport(updateSetting('maxPaletteColors', maxColors));
	}

	function exportSettings(): void {
		const blob = new Blob([serializeSettings()], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');

		link.href = url;
		link.download = 're-color-settings.json';
		link.click();

		setTimeout(() => URL.revokeObjectURL(url), 0);
	}

	async function importSettings(file: File | undefined): Promise<void> {
		if (!file) return;

		try {
			const importedSettings = importAppSettings(await file.text());

			saveOrReport(replaceSettings(importedSettings));

			if (!importedSettings.persistWorkspace) await clearWorkspace();
		} catch (cause) {
			console.error('Could not import settings file', cause);
			error =
				cause instanceof LocalizedError
					? { id: cause.messageId, values: cause.values }
					: { id: 'settings.errorImport' };
		}
	}

	function handleImportSelection(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		void importSettings(input.files?.[0]);
		input.value = '';
	}

	async function updateDefaultMapping(
		mapping: AppSettings['defaultMapping']
	): Promise<void> {
		saveOrReport(updateSetting('defaultMapping', mapping));

		try {
			const workspace = await loadWorkspace();
			if (workspace) await saveWorkspace({ ...workspace, mapping });
		} catch (cause) {
			console.error(
				'Could not save default mapping to current workspace',
				cause
			);
			error = { id: 'settings.errorMappingSave' };
		}
	}

	function resetSettings(): void {
		if (!confirm($t('settings.resetConfirm'))) return;

		saveOrReport(restoreDefaults());
	}

	async function handleClearAppData(): Promise<void> {
		if (!confirm($t('settings.clearConfirm'))) return;

		try {
			await clearSavedAppData();
			saveOrReport(restoreDefaults());
		} catch (cause) {
			console.error('Could not clear saved app data', cause);
			error = { id: 'settings.errorClear' };
		}
	}
</script>

<svelte:head>
	<title>{$t("settings.metaTitle")}</title>
	<meta
		name="description"
		content={$t("settings.metaDescription")}
	/>
	<link rel="canonical" href="https://recolor.pages.dev/settings/" />
</svelte:head>

<main class="box-border flex w-full flex-1 flex-col items-center gap-8 px-3 py-12 sm:px-4">
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
