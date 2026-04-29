# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm 10.30** and Node **≥22.12** is enforced (`engine-strict=true` in `.npmrc`).

- `pnpm install` — install dependencies
- `pnpm dev` — Astro dev server at `localhost:4321`
- `pnpm build` — production build to `./dist/`
- `pnpm preview` — preview the built site
- `pnpm astro check` — type-check `.astro` files (no separate lint/test setup exists)

There is no test suite, no linter, and no CI configured.

## Architecture

This is a **single-page Astro marketing site** for the "VECTA 98" real-estate project (Spanish copy). It is a pixel-perfect reproduction of a Figma design.

### Stack

- **Astro 6** (static, no SSR adapter, no integrations besides Tailwind)
- **Tailwind CSS v4** wired via `@tailwindcss/vite` in `astro.config.mjs` — there is **no `tailwind.config.*` file**. All theme customization lives in `src/styles/global.css` inside an `@theme { ... }` block. When adding tokens, edit that block; do not create a v3-style config.

### Page composition

`src/pages/index.astro` is the only route. It pulls in `Layout.astro` and renders the eleven sections from `src/sections/` in a fixed order. The Hero spans full viewport width and contains its own inner 1280px canvas; every section after Hero is wrapped in `min-w-[1280px] w-[1280px] mx-auto` so they all share the same canvas.

### Fixed-width 1280px canvas (important)

The site is **not responsive**. `Layout.astro` sets `<meta name="viewport" content="width=1280">` and every section is a `1280px`-wide container. Inside each section, elements use **absolute positioning with literal Figma pixel coordinates** (`left-[74px] top-[245px] w-[639px]` etc.). Comments in section files cite Figma node IDs (e.g. `2030:31`, `2030:115`) and exact x/y/w/h values from the design.

When editing sections, preserve this convention — do not refactor to flex/grid layouts. New elements should be positioned with the same Figma-derived absolute coords. The `Header.astro` component is the canonical example of this pattern (see `src/components/Header.astro`, which documents the source coordinates inline).

### Design tokens

Colors and fonts are exposed as Tailwind utilities via `@theme` in `src/styles/global.css`:

- Colors: `vecta-bg` (#f0f0f0), `vecta-lime` (#eafc9d), `vecta-lime-text` (#eafc9c), `vecta-dark` (#22291d), `vecta-night` (#151515) → use as `bg-vecta-lime`, `text-vecta-dark`, etc.
- Fonts: `font-display` = Albert Sans (body/headings), `font-nav` = Afacad (header nav). Both load from Google Fonts via the same CSS file. Many section files set `font-family: 'Albert Sans', sans-serif` inline rather than using the `font-display` utility — match the surrounding style when editing.

### Content + assets

Each section has a sibling folder under `public/sections/<section>/` containing a `content.json` (copy/structure dump from Figma) and any image/SVG assets. **Sections currently hardcode the Spanish copy in their `.astro` files** — `content.json` is reference data, not a runtime data source. Don't introduce a fetch/import wiring unless asked. Asset paths in markup are absolute (`/sections/about-us/man-phone.png`).

Hero's background image (`/sections/hero/hero-bg.jpg`) is referenced but not present in the repo — the `<img>` has an `onerror` handler that hides it and falls back to a gradient + scanline overlay defined inline. If you add the JPG, the fallback continues to work.

### Header reuse

`src/components/Header.astro` accepts `active` (current nav item) and `variant` (`light` | `dark`) props. It is currently only used inside `Hero.astro` with absolute positioning over the dark photo. If sections lower on the page need a sticky/duplicate header, reuse this component with `variant="dark"`.

## Figma workflow

The Figma MCP server is pre-allowed in `.claude/settings.local.json` for `whoami`, `get_metadata`, `get_screenshot`, and `get_design_context`. When implementing or updating a section from Figma:

1. Fetch the node via `get_design_context` for code/tokens, plus `get_screenshot` for the visual.
2. Translate to the absolute-positioning pattern above using the Figma x/y/w/h numbers literally.
3. Add a top-of-file comment citing the Figma node ID(s) and key coordinates, matching the style in `Header.astro` and `Hero.astro`.
