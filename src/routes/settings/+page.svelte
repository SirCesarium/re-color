<script lang="ts">
	import { onMount } from "svelte";
	import ButtonGroup from "#lib/components/ButtonGroup.svelte";
	import PixelSlider from "#lib/components/PixelSlider.svelte";
	import SwitchButton from "#lib/components/SwitchButton.svelte";
	import Typography from "#lib/components/Typography.svelte";
	import { MAPPING_OPTIONS } from "#lib/config/recolor.ts";
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

	let settings = $state<AppSettings>({ ...DEFAULT_APP_SETTINGS });
	let error = $state<string | null>(null);
	let loading = $state(true);

	onMount(() => {
		try {
			settings = parseAppSettings(localStorage.getItem(APP_SETTINGS_KEY));
		} catch (cause) {
			console.error("Could not read saved app settings", cause);
			error = "Could not load settings from this device.";
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
			error = "Could not save settings to this device.";
		}
	}

	function updateAnimations(enabled: boolean) {
		settings.animationsEnabled = enabled;
		document.documentElement.classList.toggle(
			"animations-disabled",
			!enabled,
		);
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
				error =
					"Workspace saving is off, but existing saved workspace data could not be removed.";
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
			document.documentElement.classList.toggle(
				"animations-disabled",
				!importedSettings.animationsEnabled,
			);
			persistSettings();

			if (!importedSettings.persistWorkspace) await clearWorkspace();
		} catch (cause) {
			console.error("Could not import settings file", cause);
			error =
				cause instanceof Error
					? cause.message
					: "Could not import settings from this file.";
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
			error = "Could not save the mapping for the current workspace.";
		}
	}

	async function handleClearAppData() {
		if (
			!confirm(
				"Clear all saved app data on this device? This cannot be undone.",
			)
		)
			return;

		try {
			await clearSavedAppData();
			settings = { ...DEFAULT_APP_SETTINGS };
			document.documentElement.classList.remove("animations-disabled");
			error = null;
		} catch (cause) {
			console.error("Could not clear saved app data", cause);
			error = "Could not clear saved app data from this device.";
		}
	}
</script>

<svelte:head>
	<title>Settings: re::color</title>
	<meta
		name="description"
		content="Configure recoloring and local data settings for re::color."
	/>
	<link rel="canonical" href="https://recolor.pages.dev/settings" />
</svelte:head>

<main
	class="box-border flex w-full flex-1 flex-col items-center justify-center gap-8 px-4 py-12"
>
	{#if !loading}
		<section class="flex w-full max-w-[560px] flex-col gap-6" aria-labelledby="settings-title">
			<Typography id="settings-title" as="h1" variant="section-label" class="m-0">
				Settings
			</Typography>

			<div class="flex items-start justify-between gap-4">
				<div class="grid min-w-0 gap-1.5">
					<Typography as="span" class="text-sm text-text">Animations</Typography>
					<Typography as="span" variant="muted" class="text-xs leading-5">
						Enable interface transitions and motion effects.
					</Typography>
				</div>
				<SwitchButton
					checked={settings.animationsEnabled}
					label="Animations"
					onchange={updateAnimations}
				/>
			</div>

			<div class="flex items-start justify-between gap-4">
				<div class="grid min-w-0 gap-1.5">
					<Typography as="span" class="text-sm text-text">Automatically apply changes</Typography>
					<Typography as="span" variant="muted" class="text-xs leading-5">
						The first result is always created once both images are ready. When disabled, later
						palette or mapping changes require pressing Recolor. Pixel exclusions stay live.
					</Typography>
				</div>
				<SwitchButton
					checked={settings.autoRecolor}
					label="Automatically apply changes"
					onchange={updateAutoRecolor}
				/>
			</div>

			<div class="flex items-start justify-between gap-4">
				<div class="grid min-w-0 gap-1.5">
					<Typography as="span" class="text-sm text-text">Save workspace on this device</Typography>
					<Typography as="span" variant="muted" class="text-xs leading-5">
						Remember selected images, palette colors, mapping, and pixel exclusions between
						visits. Turning this off also removes the saved workspace.
					</Typography>
				</div>
				<SwitchButton
					checked={settings.persistWorkspace}
					label="Save workspace on this device"
					onchange={updatePersistWorkspace}
				/>
			</div>

			<div class="grid gap-3">
				<div class="grid min-w-0 gap-1.5">
					<Typography as="span" class="text-sm text-text">Maximum palette colors</Typography>
					<Typography as="span" variant="muted" class="text-xs leading-5">
						Extract up to this many distinct colors from the palette PNG.
					</Typography>
				</div>
				<PixelSlider
					value={settings.maxPaletteColors}
					min={1}
					max={256}
					label="Maximum palette colors"
					onchange={updateMaxPaletteColors}
				/>
			</div>

			<div class="grid gap-3">
				<div class="grid min-w-0 gap-1.5">
					<Typography as="span" class="text-sm text-text">Default mapping</Typography>
					<Typography as="span" variant="muted" class="text-xs leading-5">
						Choose and apply the default color mapping mode.
					</Typography>
				</div>
				<ButtonGroup
					value={settings.defaultMapping}
					options={MAPPING_OPTIONS}
					label="Default color mapping"
					onchange={updateDefaultMapping}
				/>
			</div>

			<div class="grid gap-3 border-t border-border pt-4">
				<div class="grid min-w-0 gap-1.5">
					<Typography as="span" class="text-sm text-text">Settings backup</Typography>
					<Typography as="span" variant="muted" class="text-xs leading-5">
						Export or import preferences as a versioned JSON file. Workspace images are never
						included.
					</Typography>
				</div>
				<div class="flex flex-wrap gap-3">
					<button
						class="inline-flex min-h-[38px] items-center justify-center border-2 border-btn-edge bg-panel px-3 py-1.5 text-xs text-text shadow-[3px_3px_0_var(--btn-shadow)] hover:bg-panel-hover focus-visible:shadow-[0_0_0_2px_var(--btn-edge),3px_3px_0_var(--btn-shadow)]"
						type="button"
						onclick={exportSettings}
					>
						export settings
					</button>
					<label
						class="inline-flex min-h-[38px] cursor-pointer items-center justify-center border-2 border-btn-edge bg-panel px-3 py-1.5 text-xs text-text shadow-[3px_3px_0_var(--btn-shadow)] hover:bg-panel-hover focus-within:shadow-[0_0_0_2px_var(--btn-edge),3px_3px_0_var(--btn-shadow)]"
					>
						import settings
						<input
							class="sr-only"
							type="file"
							accept="application/json,.json"
							aria-label="Import settings JSON file"
							onchange={handleImportSelection}
						/>
					</label>
				</div>
			</div>

			<div class="grid gap-4 border-t border-border pt-4">
				<Typography as="p" variant="muted" class="text-xs leading-5">
					App preferences and workspace data are stored locally on this device.
				</Typography>
				<div class="flex items-start justify-between gap-4 max-[420px]:flex-col">
					<div class="grid min-w-0 gap-1.5">
						<Typography as="span" class="text-sm text-text">Clear app data</Typography>
						<Typography as="span" variant="muted" class="text-xs leading-5">
							Delete saved images, preferences, and hint history from this device.
						</Typography>
					</div>
					<button
						class="flex-none border-2 border-[var(--sw-red)] bg-panel px-2.5 py-2 text-xs text-[var(--sw-red)] shadow-[3px_3px_0_var(--btn-shadow)] hover:bg-[var(--sw-red)] hover:text-panel"
						type="button"
						onclick={handleClearAppData}
					>
						clear app data
					</button>
				</div>
			</div>
		</section>
	{/if}

	{#if error}
		<Typography
			as="p"
			variant="body"
			class="w-full max-w-[560px] text-sm text-[var(--sw-red)]"
			role="alert"
		>
			{error}
		</Typography>
	{/if}
</main>
