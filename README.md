<div align="center">

[![re::color hero](https://github.com/user-attachments/assets/93ef7e53-62e1-4b47-9fdc-6190ad29b162)](https://recolor.pages.dev/)

[![CI](https://github.com/SirCesarium/re-color/actions/workflows/ci.yml/badge.svg)](https://github.com/SirCesarium/re-color/actions/workflows/ci.yml)
[![License: MPL-2.0](https://img.shields.io/github/license/SirCesarium/re-color?logo=mozilla)](LICENSE)
[![Built with Svelte](https://img.shields.io/badge/Svelte-5-FF3E00?logo=svelte)](https://svelte.dev/)

Recolor a pixel art sprite with any image's palette, privately, in your browser.

**[Try it at recolor.pages.dev](https://recolor.pages.dev/)**

</div>

## See it in action

<div align="center">

https://github.com/user-attachments/assets/a3342c9b-3b56-4470-8efb-a7340e2f74d9

</div>

## Features

### Any image is a palette

Extract a color palette from a reference sprite and **re-colorize** another one. re::color pulls up to **64 colors** (configurable from 1 to 256) out of the reference image and uses them to repaint your sprite.

### Three ways to map colors

- **Luminance order**: sorts both sprite and palette by brightness and pairs them, so shading survives the swap.
- **Nearest color**: direct RGB nearest-neighbor.
- **Dominant color**: finds your sprite's most-used color and pins it to the palette's dominant, then fills in the rest.

<div align="center">

<img width="512" alt="Any image is a palette" src="https://github.com/user-attachments/assets/a0a52175-0737-49a2-a27d-0429b5c12085" />

</div>

### Pixel-level control

Tap any pixel in the live preview to exclude it from the recolor. Zoom with the mouse wheel and pan with the middle or right button.

<div align="center">

<img width="1159" height="746" alt="Pixel-level control" src="https://github.com/user-attachments/assets/9340673f-097e-4328-9041-686e24a691b0" />

</div>

### Download the result

Export the recolored sprite as a PNG, same dimensions as your input, named `<name>-recolored.png`.

### Your session survives a reload

The current palette, sprite, mapping mode and pixel exclusions are saved locally (IndexedDB), so a refresh doesn't lose your work. You can turn this off in settings.

<div align="center">

<img width="907" alt="Your session survives a reload" src="https://github.com/user-attachments/assets/19447af9-8824-4797-9b92-443884635fdc" />

</div>

### Preferences that stick

Auto-apply the result, maximum palette colors, default mapping mode, and animations, all in [/settings](https://recolor.pages.dev/settings). Export your preferences as a JSON file and import them on another device, or reset everything to defaults with one click.

<div align="center">

<img width="600" alt="settings" src="https://github.com/user-attachments/assets/eecd61b9-339e-4f06-8a6e-b43b5ed77335" />

</div>

### Install it as an app

re::color is a PWA: install it from your browser and it runs standalone and offline.

<div align="center">

<img width="512" alt="Install as an app" src="https://github.com/user-attachments/assets/1ab845c8-30ec-4659-8d09-41b3c9453a34" />

</div>

## Limits

| Constraint     | Value     |
| -------------- | --------- |
| Format         | PNG       |
| Max dimensions | 512 × 512 |
| Max file size  | 2 MiB     |

## Privacy

Every pixel is processed on-device, there's not any server processing your images.

Review the [license](./LICENSE) or the [privacy section](https://recolor.pages.dev/privacy) for more info.

## Under the hood

- **Web Worker**: PNG decoding and palette counting run off the main thread, so the UI stays responsive.
- **Service worker**: the whole app is precached: it works offline after the first load, and updates install themselves in the background.
- **Security headers**: `nosniff`, `no-referrer` and `X-Frame-Options: DENY` on every response.

## For devs

### Checks

The CI runs these five commands on every push and pull request. Run them before opening one:

```bash
bun run check        # svelte-check
bun run lint         # prettier + eslint
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

Distributed under the [MPL-2.0](./LICENSE) License.
