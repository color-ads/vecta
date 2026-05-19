# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm 10.30** and Node **≥22.12** is enforced (`engine-strict=true` in `.npmrc`).

- `pnpm install` — install dependencies
- `pnpm dev` — Astro dev server at `localhost:4321`
- `pnpm build` — production build to `./dist/`
- `pnpm preview` — preview the built site
- `pnpm astro check` — type-check `.astro` files (requires `@astrojs/check`; install with `pnpm add -D @astrojs/check typescript` first)

There is no test suite, no linter, and no CI configured.

## Architecture

Single-page Astro marketing site for the "VECTA 98" real-estate project (Spanish copy). Originally a pixel-perfect reproduction of a Figma design (1280px canvas); the codebase has since been migrated to a fluid, mobile-first responsive layout while preserving the original visual proportions.

### Stack

- **Astro 6** (static, no SSR adapter, no integrations besides Tailwind).
- **Tailwind CSS v4** wired via `@tailwindcss/vite` in `astro.config.mjs`. There is **no `tailwind.config.*` file** — all theme tokens live in `src/styles/global.css` inside a `@theme { ... }` block.
- **Contentful CMS** — most sections fetch content at build time using `@contentful/rich-text-html-renderer` and the Contentful JS SDK. Credentials live in `.env` (see `.env.example`). Sections that call Contentful do so in their Astro frontmatter; do **not** add Contentful fetches to client-side `<script>` blocks.

### Page composition

`src/pages/index.astro` is the main route (the only other is `/gracias` for post-form confirmation). It mounts `Layout.astro`, renders a fixed `<header>` that wraps `Header.astro`, and then renders nine sections from `src/sections/` in order:

```
Hero → ProyectoIntro → AboutCarousel → Espacios → Tipologias →
Ubicacion → Galeria → Preguntas → Formulario
```

`AboutCarousel.astro` is a single section that internally swaps between three slides (manifesto / 4 numbered cards / amenidades grid). All three slides are stacked with `absolute inset-0` and crossfade via opacity — that absolute is structurally required, do not refactor away.

The header is **global and fixed** (rendered once in `index.astro`, not inside any section). The `index.astro` script flips a `data-nav-theme` attribute on `#site-nav` based on which section the nav line crosses, and the matching theme rules live in `global.css` (`#site-nav[data-nav-theme="X"] .text-white { color: ... }` overrides Tailwind utilities by class name from a parent attribute).

### Viewport and responsive system

`Layout.astro` uses the standard `<meta name="viewport" content="width=device-width, initial-scale=1.0">` — there is no viewport-pinning trick. Layouts are responsive via Tailwind variants, not via fixed-width canvases.

**Tailwind breakpoint customization** (in `global.css`'s `@theme`):

```css
--breakpoint-md: 769px;
```

This shifts `md:` from the default 768 → 769 so that `max-md:` covers ≤768 **inclusive** (iPad portrait at exactly 768px gets mobile/tablet styling instead of PC layout). All other breakpoints are Tailwind defaults: `sm:`≥640, `lg:`≥1024, `xl:`≥1280, `2xl:`≥1536.

**Responsive variant patterns used throughout the codebase:**

| Variant | Range | Used for |
|---------|-------|----------|
| `max-sm:` | ≤639 (phone) | Phone-only overrides |
| `sm:max-md:` | 640–768 (tablet) | Tablet-only overrides |
| `max-md:` | ≤768 (phone+tablet) | Mobile/tablet shared overrides |
| `md:max-lg:` | 769–1023 (PC small) | PC-small overrides |
| `lg:` | ≥1024 | Desktop |
| `xl:` / `2xl:` | ≥1280 / ≥1536 | Wider PC, ultra-wide |

The PC base (no prefix) is the "Figma layout" canvas at 1280px. **Mobile-first rule:** when you need to tweak only one resolution, use a scoped variant — don't modify the base class for a single-resolution tweak. Base classes apply at every resolution where there's no override and bleed across breakpoints.

### data-device attribute (for JS only)

`Layout.astro` runs an inline `<head>` script that classifies the device by `window.innerWidth` and writes `data-device` on `<html>`:

| Value | When |
|-------|------|
| `phone` | ≤600 |
| `tablet` | 601–768 |
| `pc-small` | 769–1024 |
| `desktop` | ≥1025 |

This attribute is **not** used by Tailwind variants anymore (those use pure `@media` queries). It is used by:

1. **JS** that branches on device — read it as `document.documentElement.getAttribute('data-device') === 'phone'`. Used by `Preguntas.astro`, `Tipologias.astro`, `AboutCarousel.astro`, `Ubicacion.astro` to keep JS positioning in sync with CSS layout. Do **not** use `matchMedia('(pointer: coarse)')` — it fires on iPad and any touch device, which de-syncs JS from CSS.
2. **Nav visibility selectors** in `global.css`: `html[data-device="phone"] .desktop-nav { display: none }` (hides PC nav on phones+tablets, shows hamburger).

### Section pattern

Each section is `relative w-full min-h-screen` and may contain an inner canvas div `relative w-full max-w-[1280px] mx-auto` that's the Figma reference frame. Content inside the canvas uses positioning in **% of the canvas** (e.g. `top-[37.76%]`, `left-[5.78%]`, `w-[49.92%]`) so it scales proportionally with the canvas width/height.

Avoid absolute positioning where flex-flow works (especially in mobile overrides). When you do use absolute positioning, prefer `%` over `px` for canvas-relative values; reserve `px` for UI controls (icons, borders, gaps, form inputs, tactile minimums of 44px).

### CSS architecture — Tailwind only, no `<style>` blocks in components

Components contain **zero `<style>` blocks** — all styling is Tailwind utility classes (or arbitrary values like `top-[calc(100vh-1037px)]`). The only CSS-only file is `src/styles/global.css`, which holds:

- The Tailwind import + `@theme` tokens (colors, fonts, breakpoint overrides).
- `html, body` defaults (background-color, color, font, `overscroll-behavior-y: none` to prevent iOS rubber-band bounce from revealing the body bg after the last section).
- Things Tailwind utilities cannot express:
  - `.form-input-validate:user-invalid` border (the `:user-invalid` pseudo-class).
  - Hero's `.hero-video::-webkit-media-controls...` (browser shadow-DOM pseudo-elements).
  - Header hamburger ↔ X morph (compound `[data-mobile-toggle][aria-expanded="true"] .burger-line:nth-child(N)` selector).
  - Nav theme overrides (`#site-nav[data-nav-theme="X"] .text-white { color: ... }` — overrides utilities by class name from a parent attribute).
  - `html[data-device="phone|tablet"] .desktop-nav { display: none !important }` plus the inverse for `.mobile-hamburger` — so the right nav variant is visible before JS runs and beyond any cascade conflict.

Inline `style="..."` is acceptable only for **dynamic values computed from a JS array index or build-time map** (e.g. `Preguntas.astro` FAQ tops managed by JS, `TipologiaAbierta2.astro` row positions via `style={`top: ${ROW_TOPS_PCT[idx]};`}`). Static values belong in Tailwind arbitrary values.

### Design tokens

Exposed via `@theme` in `src/styles/global.css`:

- Colors: `vecta-bg` (#f0f0f0), `vecta-lime` (#eafc9d), `vecta-lime-text` (#eafc9c), `vecta-dark` (#22291d), `vecta-night` (#151515) → use as `bg-vecta-lime`, `text-vecta-dark`, etc.
- Fonts: `font-display` = Albert Sans (body/headings), `font-nav` = Afacad (header nav). Both load from Google Fonts via `<link>` in `Layout.astro` (with the print/onload async trick) — not via CSS `@import`.

### actualcorp logo (nav corner) — color per section

The `actualcorp` logo (`/Logo_Blanco.png`, a white PNG with transparency) lives in `Header.astro` at the top-right corner. Its color is controlled via CSS `filter: invert(1)` per active section in `global.css`:

- **Default**: white (PNG's natural color).
- **Over lime-bg sections** (`#inversion`, `#ubicacion`, `#formulario`): inverted to black.
- **Over AboutCarousel** (block 3): conditional by `data-nav-theme` — slide 1 (`about`) and 3 (`lime`) keep white; slide 2 (`dark`) inverts to black.

When changing the logo asset, update both `Header.astro` and (if it exists) the duplicate instance in `AboutCarousel.astro` slide 3.

### Carousels and slide mechanics

Three places use crossfade-style carousels with absolute slides:

- **AboutCarousel** (block 3): 3 slides stacked, dots on the left strip switch them, on mobile auto-advance every 5s.
- **Espacios** (block 4): 5 slides (background images + title/subtitle text) auto-rotate every 5s. Mobile-only swipe nav.
- **Tipologias** (block 5): on phone+tablet, swaps PC's polygonal-callout building image for a horizontal carousel of `TipologiaAbierta2.astro` slides.

Pattern: slides have `absolute inset-0 transition-opacity duration-500` and toggle `opacity-0`/`opacity-100`. The carousel wrapper is itself `absolute inset-0` of its section — **don't refactor that wrapper to non-absolute**, the crossfade depends on it.

### Form integration

`Formulario.astro` submits to HubSpot via a client-side `fetch` POST. The portal ID and form GUID are embedded directly in the script — there is no server-side proxy. Successful submission redirects to `/gracias`. Do not move form submission to a server endpoint unless explicitly requested.

### Tipologías modal

`Tipologias.astro` renders the building image with 5 polygonal callouts on PC; on phone+tablet it swaps to a horizontal auto-advancing carousel (`TipologiaAbierta2.astro`, one slide per tipología). Clicking a callout opens `TipologiaModal.astro`, which hosts `TipologiaAbierta.astro` (the render + floor-plan detail view, `data-tipologia-*` selectors scoped to the modal).

### Browser compatibility considerations

- **Tailwind v4 requires Chrome 111+ / Firefox 128+**. Older browsers (e.g. Chrome 109 on Windows 7) will fail on features like `color-mix()`.
- **Avoid Tailwind v4's `/X` alpha modifier** (e.g. `bg-vecta-lime/40`) for anything that needs to render on older browsers — it generates `color-mix(in oklab, ...)`. Use 8-digit hex alpha instead: `bg-[#eafc9d66]` (66 = 40% alpha). Universally supported since 2017.
- **Fixed nav requires GPU acceleration on iOS Safari** to avoid lag during fast scroll. The `#site-nav` in `index.astro` and `gracias.astro` has `transform-gpu will-change-transform backface-hidden` plus webkit-prefixed equivalents — keep them.

### Content + assets

Each section folder under `public/sections/<section>/` contains reference assets. Sections currently mix between hardcoded Spanish copy and Contentful-fetched copy — Contentful is the source of truth where wired. Asset paths in markup are absolute (`/sections/hero/vecta-logo.svg`).

Hero uses Contentful's `heroBackground` field as a full-bleed video or image (auto-detected by `contentType`). A gradient + scanline overlay below provides moody texture either way.

## Figma workflow

The Figma MCP server is pre-allowed in `.claude/settings.local.json` for `whoami`, `get_metadata`, `get_screenshot`, and `get_design_context`. When implementing or updating a section from Figma:

1. Fetch the node via `get_design_context` for code/tokens, plus `get_screenshot` for the visual.
2. Translate to the canvas-with-`%` pattern (or flex flow if appropriate) — preserve Figma's relative proportions but don't hardcode px for layout when a `%` or `vw`/`vh` will work.
3. Add a top-of-file comment citing the Figma node ID(s) when the source matters.

## Recent migrations (context for understanding the code)

- **Responsive variant system migration**: an earlier version used custom `@custom-variant` declarations (`mobile:`, `narrow:`, `tablet:`, `tablet-device:`, `pc-small:`, `desktop:`) tied to `data-device`. All call sites were migrated to standard Tailwind variants. References to the old variants only survive in git history and migration docs (`RESPONSIVE-MIGRATION-TO-TAILWIND.md`).
- **px → % migration**: many position and dimension values were converted from literal Figma px (e.g. `top-[245px]`) to canvas-relative `%` (e.g. `top-[29.45%]`). UI controls (form inputs, icons, borders, gaps) remain in px by design — `%` is incorrect for those. See `PX-TO-PERCENT-PLAN.md` for the mapping.
- **Meta viewport**: the codebase previously used `<meta viewport="width=1280">` (forcing all devices to render at the 1280 canvas). That was replaced with `width=device-width`, and the layout was rebuilt to be genuinely responsive. Do not re-introduce the fixed viewport.
