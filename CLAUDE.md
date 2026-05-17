# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm 10.30** and Node **≥22.12** is enforced (`engine-strict=true` in `.npmrc`).

- `pnpm install` — install dependencies
- `pnpm dev` — Astro dev server at `localhost:4321`
- `pnpm build` — production build to `./dist/`
- `pnpm preview` — preview the built site
- `pnpm astro check` — type-check `.astro` files

There is no test suite, no linter, and no CI configured.

## Architecture

Single-page Astro marketing site for the "VECTA 98" real-estate project (Spanish copy). Pixel-perfect reproduction of a Figma design with per-resolution responsive behaviour layered on top.

### Stack

- **Astro 6** (static, no SSR adapter, no integrations besides Tailwind).
- **Tailwind CSS v4** wired via `@tailwindcss/vite` in `astro.config.mjs`. There is **no `tailwind.config.*` file** — all theme tokens and custom variants live in `src/styles/global.css` inside `@theme { ... }` and `@custom-variant ...` blocks.
- **Contentful CMS** — several sections fetch live content at build time using `@contentful/rich-text-html-renderer` and the Contentful JS SDK. Credentials live in `.env` (see `.env.example`). Sections that call Contentful do so in their Astro frontmatter; do not add Contentful fetches to client-side `<script>` blocks.

### Page composition

`src/pages/index.astro` is the only route. It mounts `Layout.astro`, renders a fixed sticky `<header>` that wraps `Header.astro`, and then renders nine sections from `src/sections/` in order:

```
Hero → ProyectoIntro → AboutCarousel → Espacios → Tipologias →
Ubicacion → Galeria → Preguntas → Formulario
```

`AboutCarousel.astro` is a single section that internally swaps between three slides (manifesto / 4 numbered cards / amenidades grid) — it replaces what used to be three separate sections, so any reference to "AboutUs / AboutCards / AboutAmenidades" applies to slides inside this component.

The header in `index.astro` is **global and sticky** (not rendered inside Hero). The same `index.astro` script flips a `data-nav-theme` attribute on `#site-nav` based on which section the nav line crosses, and the matching theme rules live in `global.css` (overrides `bg-white` / `text-white` / `border-white` utilities by class name from inside `#site-nav[data-nav-theme="X"]`).

### Fixed-width 1280px canvas

The PC layout is **not fluid**. `Layout.astro` sets `<meta name="viewport" content="width=1280">` and every section is a `1280px`-wide container with `min-w-[1280px]`. Inside each section, elements use **absolute positioning with literal Figma pixel coordinates** (`left-[74px] top-[245px] w-[639px]` etc.). Comments in section files cite Figma node IDs (e.g. `2030:31`, `2030:115`) and exact x/y/w/h values from the design.

When editing sections, preserve this convention — do not refactor to flex/grid layouts. New PC elements should be positioned with the same Figma-derived absolute coords. `Header.astro` documents the source coordinates inline as the canonical example.

### Responsive layout — `data-device` and the variant system (CRITICAL)

The site IS responsive, but media queries alone don't work because `<meta viewport=1280>` pins the layout viewport to 1280 on mobile devices, hiding the real device size from CSS. To work around this, `Layout.astro` runs an inline `<head>` script that classifies the device by reading `Math.min(window.innerWidth, screen.width, window.visualViewport.width)` and writes a `data-device` (and `data-layout`) attribute on `<html>`:

| `data-device` | Bucket | When |
|---|---|---|
| `phone` | true phones | min ≤ 768 |
| `pc-small` | small PC (1024 desktop, iPad landscape) | 769–1024 |
| `desktop` | full PC | ≥ 1025 |

Listeners on `window.resize`, `orientationchange`, `DOMContentLoaded`, AND `visualViewport.resize` keep the attribute fresh — the `visualViewport.resize` listener is essential because DevTools "Toggle device toolbar" pins `innerWidth` to 1280 even when you drag narrower, and only `visualViewport.width` reflects the actual visible width in that mode.

`global.css` defines custom Tailwind variants. **Definition order is load-bearing** — `narrow:` is defined first so `mobile:` (defined last) appears later in the CSS output and wins the cascade on phones:

```css
/* defined first — loses cascade to mobile: on phones */
@custom-variant narrow   (media:601-768px + data-device phone|tablet)
/* … tablet, pc-small, desktop … */
/* defined last — always wins over narrow: on phones */
@custom-variant mobile   (@media max-width:600px + html[data-device][data-device="phone"])
```

The `mobile:` data-device selector uses a **double attribute** `html[data-device][data-device="phone"]` giving it [0,2,1] specificity vs narrow's [0,1,1]. This guarantees `mobile:` beats `narrow:` on phones even if stylesheet order shifts. **Never swap the definition order and never simplify the double-attribute selector.**

**Per-resolution isolation rule (user-enforced — see also `MEMORY.md`):**

| Edit target | Use |
|---|---|
| Phone | `mobile:property` |
| 601–768 tablet | `tablet:property` or `tablet-device:property` |
| 1024 small PC | `pc-small:property` (or `pc-small:!` to override base) |
| 1440 PC | `desktop:property` |
| Phone + tablet (≤768) | `narrow:property` — but `mobile:` overrides it on phones |

**Never** modify a base (no-prefix) class for a single-resolution tweak — base classes apply at every resolution where there's no override and bleed across breakpoints. **Always** use a scoped variant.

**JS that branches on "isMobile" MUST read `document.documentElement.getAttribute('data-device') === 'phone'`** — exactly the same condition that fires the `mobile:` variant. Do NOT use `matchMedia('(pointer: coarse), (hover: none), (max-width: 1280px)')` — it fires on iPad and any ≤1280 viewport, which de-syncs JS positioning from CSS layout (the FAQ section has been bitten by this before; the current `Preguntas.astro`, `Tipologias.astro`, and `AboutCarousel.astro` scripts all use the data-device check).

#### Brute-force nav fallback

`Layout.astro`'s `setDevice()` also directly sets `style.display` (inline) on `.desktop-nav` and `.mobile-hamburger` elements based on the visible width. Inline styles outrank any CSS rule, so this is the last line of defense when DevTools/meta-viewport quirks make CSS-based detection unreliable.

### CSS architecture — Tailwind only, no `<style>` blocks in components

Components contain **zero `<style>` blocks** — all styling is Tailwind utility classes (or arbitrary values like `top-[calc((100vw-1270px)/8)]`). The only CSS-only file is `src/styles/global.css`, which holds:

- The Tailwind import + `@theme` tokens + `@custom-variant` declarations.
- `html, body` defaults.
- Things Tailwind utilities cannot express:
  - `.form-input-validate:user-invalid` border (`:user-invalid` pseudo-class).
  - Hero's `.hero-video::-webkit-media-controls...` (browser shadow-DOM pseudo-elements).
  - Header hamburger ↔ X morph (compound `[data-mobile-toggle][aria-expanded="true"] .burger-line:nth-child(N)` selector).
  - Nav theme overrides (`#site-nav[data-nav-theme="X"] .text-white { color: ... }` — overrides utilities by class name from a parent attribute).
  - Flat data-device fallbacks for `.desktop-nav` / `.mobile-hamburger` visibility (so the hamburger appears before JS runs).

Inline `style="..."` is acceptable only for **dynamic values computed from a JS array index or build-time map** (e.g. `Header.astro` nav-item left positions, `Preguntas.astro` FAQ tops managed by JS). Static dimensions/positions belong in Tailwind arbitrary values.

### Design tokens

Exposed via `@theme` in `src/styles/global.css`:

- Colors: `vecta-bg` (#f0f0f0), `vecta-lime` (#eafc9d), `vecta-lime-text` (#eafc9c), `vecta-dark` (#22291d), `vecta-night` (#151515) → use as `bg-vecta-lime`, `text-vecta-dark`, etc.
- Fonts: `font-display` = Albert Sans (body/headings), `font-nav` = Afacad (header nav). Both load from Google Fonts via `<link>` in `Layout.astro` (with the print/onload async trick) — not via CSS `@import`.

### Content + assets

Each section has a sibling folder under `public/sections/<section>/` containing reference content/assets. Sections currently hardcode the Spanish copy in their `.astro` files — the `content.json` files (where present) are reference data, not a runtime data source. Don't introduce a fetch/import wiring unless asked. Asset paths in markup are absolute (`/sections/about-us/man-phone.webp`).

Hero uses `/herobg.mp4` as a full-bleed background video. A gradient + scanline overlay below the video provides the same moody fallback if it fails to load.

### Form integration

`Formulario.astro` submits to HubSpot via a client-side `fetch` POST. The portal ID and form GUID are embedded directly in the script — there is no server-side proxy. Do not move form submission to a server endpoint unless explicitly requested.

### Tipologías modal

`Tipologias.astro` renders the building image with 5 polygonal callouts on PC; on phone it swaps to a horizontal auto-advancing carousel (`TipologiaAbierta2.astro`, one slide per tipología). Clicking a callout opens `TipologiaModal.astro`, which hosts `TipologiaAbierta.astro` (the render + floor-plan detail view, `data-tipologia-*` selectors scoped to the modal).

## Figma workflow

The Figma MCP server is pre-allowed in `.claude/settings.local.json` for `whoami`, `get_metadata`, `get_screenshot`, and `get_design_context`. When implementing or updating a section from Figma:

1. Fetch the node via `get_design_context` for code/tokens, plus `get_screenshot` for the visual.
2. Translate to the absolute-positioning pattern above using the Figma x/y/w/h numbers literally.
3. Add a top-of-file comment citing the Figma node ID(s) and key coordinates, matching the style in `Header.astro`, `Hero.astro`, and `AboutCarousel.astro`.
