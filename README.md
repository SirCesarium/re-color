<div align="center">

<h1>re::color</h1>

![re::color hero](static/og.png)

Recolor a pixel art sprite with any image's palette, privately, in your browser.

**[Try it at recolor.pages.dev](https://recolor.pages.dev/)**

[![CI](https://github.com/SirCesarium/re-color/actions/workflows/ci.yml/badge.svg)](https://github.com/SirCesarium/re-color/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/SirCesarium/re-color)](LICENSE)
[![Built with Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte)](https://svelte.dev/)
[![Bun](https://img.shields.io/badge/Bun-scripts%20%26%20build-000000?logo=bun)](https://bun.sh/)
[![Privacy First](https://img.shields.io/badge/Privacy-Local%20only-00C853)](#privacy)

</div>

## See it in action

<div align="center">

https://github.com/user-attachments/assets/7bd850c8-d3ed-44b3-8350-7cd14f139fb0

</div>

## Features

### Any image is a palette

Extract a color palette from a reference sprite and __re-colorize__ another one. re::color pulls up to **64 colors** (configurable from 1 to 256) out of the reference image and uses them to repaint your sprite.

### Three ways to map colors

- **Nearest color**: direct RGB nearest-neighbor.
- **Luminance order**: sorts both sprite and palette by brightness and pairs them, so shading survives the swap.
- **Dominant color**: finds your sprite's most-used color and pins it to the palette's dominant, then fills in the rest.

<img width="512" height="129" alt="image" src="https://github.com/user-attachments/assets/1fcdcf29-0cac-46c4-aee5-4ef3a0cc2003" />

### Pixel-level control

Tap any pixel in the live preview to exclude it from the recolor.

<img width="1025" height="560" alt="image" src="https://github.com/user-attachments/assets/a7baed56-1518-474b-9832-a69773f1d478" />

### Download the result

Export the recolored sprite as a PNG, same dimensions as your input, named `<name>-recolored.png`.

### Your session survives a reload

The current palette, sprite, mapping mode and pixel exclusions are saved locally (IndexedDB), so a refresh doesn't lose your work. You can turn this off in settings.

<img width="907" height="128" alt="image" src="https://github.com/user-attachments/assets/19447af9-8824-4797-9b92-443884635fdc" />

### Preferences that stick

Auto-apply the result, maximum palette colors, default mapping mode, animations and help hints, all in [/settings](https://recolor.pages.dev/settings). Export your preferences as a JSON file and import them on another device, or reset everything to defaults with one click.

<img width="973" height="818" alt="image" src="https://github.com/user-attachments/assets/250f99df-8096-4e60-83c5-341a633067b9" />

### Available in English and Spanish

The interface follows your browser language on first visit, and you can switch anytime in settings.

<img width="911" height="268" alt="image" src="https://github.com/user-attachments/assets/8ebf6028-67f8-4779-a2d3-1aeaa2c8e0bc" />

### Install it as an app

re::color is a PWA: install it from your browser and it runs standalone and offline.

## Limits

| Constraint     | Value     |
| -------------- | --------- |
| Format         | PNG       |
| Max dimensions | 512 × 512 |
| Max file size  | 2 MiB     |

> [!NOTE]
> Currently, this project is designed for small pixel art, such as 8x8px or 16x16px or even 32x32px. For larger images, you might experience some issues with the tool for excluding pixels from recoloring. Improvements to the UX in this area are planned for the near future.

## Privacy

No uploads. No accounts. No analytics. Every pixel is processed on-device, and the app works offline after the first load.

Review the [license](./LICENSE) or the [privacy section](https://recolor.pages.dev/privacy).

## Under the hood

- **Web Worker**: PNG decoding and palette counting run off the main thread, so the UI stays responsive.
- **Service worker**: the whole app is precached: it works offline after the first load, and updates install themselves in the background.
- **Security headers**: `nosniff`, `no-referrer` and `X-Frame-Options: DENY` on every response.

## For devs

### Checks

The CI runs these five commands on every push and pull request. Run them before opening one:

```bash
bun run check        # svelte-check
bun run lint         # biome check
bun run test:domain  # domain tier — Vitest under node, no DOM
bun run test:ui      # ui tier — Vitest under jsdom
bun run build
```

`domain` runs without a DOM so browser APIs cannot quietly creep into `src/lib/core/`; `ui` covers the reactive workflow and the widgets, which do need a document. `bun run test` runs both.

### Running with Docker

1. Build the image.

```bash
docker build -t re-color .
```

2. Run the image.

```bash
docker run -d -p 8080:80 --name re-color-app re-color
```

### Opening in Visual Studio Code

- Make sure you have the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension installed.
  1. Open the command palette by pressing `F1` or `Ctrl+Shift+P` (`Cmd+Shift+P` on macOS).
  2. Type and select **`Dev Containers: Reopen in Container`**. This will build the container and bring up all the required development tools automatically.

- If you don't want to use the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension you'll need to install [bun](https://bun.sh/), and then:
  1. Run: `bun install --frozen-lockfile`.
  2. Run: `bun run dev`.

## License

[MIT © SirCesarium](./LICENSE)
