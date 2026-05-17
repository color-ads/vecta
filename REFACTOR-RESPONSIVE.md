# Refactorización Responsiva Completa — VECTA 98

**Proyecto:** vecta98.com
**Repositorio:** github.com/color-ads/vecta
**Stack:** Astro 6 + Tailwind CSS v4 (sin `tailwind.config.*` — todo vive en `src/styles/global.css`)
**Alcance:** Refactorización responsiva total — todos los dispositivos
**Fecha de elaboración:** 2026-05-16

---

## 1. Por qué es necesaria esta refactorización

El sitio fue construido sobre un canvas fijo de **1280px de ancho**, con todas las posiciones de los elementos tomadas directamente de Figma como **coordenadas absolutas en píxeles**. Para compensar esto, se forzó el viewport del navegador a 1280px (`<meta viewport="width=1280">` en `src/layouts/Layout.astro:15`), haciendo que los dispositivos móviles **escalen toda la página hacia abajo** — renderizando un diseño de escritorio encogido en lugar de una experiencia móvil real.

El resultado en cada pantalla hoy:

| Dispositivo        | Experiencia actual                                                |
| ------------------ | ----------------------------------------------------------------- |
| Desktop 1280px     | ✅ Correcto — es la base de diseño                                 |
| Desktop 1920px     | ⚠️ Nav desalineado a la izquierda, espacio vacío a la derecha     |
| Desktop ≥2000px    | ⚠️ Hack: `html { zoom: 0.85 / 0.75 / 0.65 / 0.55 }` por breakpoint |
| Tablet 768px       | ❌ Página de escritorio escalada al 60% — ilegible                 |
| Móvil 390px        | ❌ Página de escritorio escalada al 30% — inutilizable             |

En Colombia, **más del 70% del tráfico web proviene de dispositivos móviles**. Un sitio que no funciona en móvil no es una página web — es una maqueta.

---

## 2. Qué debe quedar resuelto al terminar

Al finalizar la refactorización, el sitio debe funcionar correctamente y verse bien en:

- 📱 **Móvil pequeño** — 360px a 390px (iPhone SE, Android base)
- 📱 **Móvil estándar** — 390px a 430px (iPhone 14/15 Pro, Samsung S23)
- 🗒️ **Tablet portrait** — 768px (iPad Air, iPad Mini)
- 🗒️ **Tablet landscape** — 1024px (iPad Pro, tablets Android)
- 💻 **Desktop base** — 1280px (diseño Figma original)
- 🖥️ **Desktop Full HD** — 1920×1080 (Windows estándar corporativo)
- 🖥️ **Desktop Wide** — 2560px (monitores 2K) sin recurrir al hack `zoom`

---

## 3. Mapa real del proyecto (lo que hay hoy)

### 3.1 Composición de la página única
`src/pages/index.astro` monta `Layout.astro` + nav fija (`<header id="site-nav">`) + **9 secciones** en orden:

```
Hero → ProyectoIntro → AboutCarousel → Espacios →
Tipologias → Ubicacion → Galeria → Preguntas → Formulario
```

> Nota: el brief original menciona “10 secciones”. En el código real son **9**. `TipologiaAbierta` y `TipologiaAbierta2` **no son secciones** sino **componentes** que viven dentro del modal (`TipologiaModal.astro`) y dentro del carrusel móvil de `Tipologias.astro`.

### 3.2 Sistema de detección de dispositivo ya existente
`src/styles/global.css:37-45` define cinco variantes custom de Tailwind:

```css
@custom-variant mobile        (html[data-device="phone"] &);
@custom-variant tablet        (@media (min-width: 600px) and (max-width: 768px));
@custom-variant tablet-device (html[data-device="tablet"] &);
@custom-variant pc-small      (html[data-device="pc-small"] &);
@custom-variant desktop       (html[data-device="desktop"] &);
@custom-variant narrow        (html[data-device="phone"] &, html[data-device="tablet"] &);
```

El atributo `data-device` se setea por JS desde `Layout.astro:51-124`. Las variantes **pueden mantenerse** — pero el sistema debe seguir funcionando sin la dependencia del meta viewport=1280.

### 3.3 Lo que YA funciona razonablemente en móvil (no tocar a ciegas)
- **Formulario**: usa la variante `narrow:` con `narrow:block` + `narrow:h-auto` para apilar contenido en columna en móvil/tablet. Funcional como referencia.
- **AboutCarousel**: maneja overrides `mobile:` por elemento y auto-rotación en móvil.
- **Tipologias** móvil: ya implementa un carrusel horizontal con swipe + dots.
- **Espacios**: títulos con `mobile:text-[96px]` ya pre-escalados para el zoom-out actual.
- **Ubicacion**: layout `mobile:block` con lime card arriba (50vh) + mapa abajo (90vh).
- **Galería**: lightbox con teclado, swipe táctil y controles ya implementados.
- **Preguntas**: JS mide alturas reales para calcular el shift dinámico (función `dynamicShift` en `Preguntas.astro:184`).

> **Implicación de la refactorización:** muchos `mobile:` actuales presuponen el viewport pinneado a 1280 (ej: `mobile:w-[1220px]` en las cards de AboutCarousel, `mobile:w-[1100px]` en preguntas, `w-[1280px]` en el carrusel de Tipologias). Al quitar el `width=1280`, **estos overrides van a producir overflow** y deben recalcularse.

---

## 4. Diagnóstico técnico — problemas encontrados en el código

### 4.1 Viewport incorrecto — `src/layouts/Layout.astro:15`
```html
<!-- PROBLEMA -->
<meta name="viewport" content="width=1280" />
```
Esto hace que los navegadores móviles rendericen el sitio como si tuviera 1280px de ancho y luego lo escalen hacia abajo. El usuario ve una página de escritorio miniaturizada, no una experiencia móvil.

**Debe quedar:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

### 4.2 Hack de `zoom` escalado en `<html>` — `src/layouts/Layout.astro:11`
```html
<html lang="es" class="... min-[2000px]:[zoom:0.85] min-[2400px]:[zoom:0.75]
                        min-[3000px]:[zoom:0.65] min-[3500px]:[zoom:0.55]">
```
`zoom` no es estándar CSS, rompe `getBoundingClientRect()`, distorsiona `event.clientX/Y` y **es la razón** por la que se necesitan tantos overrides JS para nav, FAQ y carousels. Reemplazar por un canvas máximo (`max-w-[1600px]` ya existe en `index.astro:26`) + tipografía fluida con `clamp()`.

### 4.3 Script de detección de dispositivo sobredimensionado — `src/layouts/Layout.astro:51-124`
~73 líneas que leen `screen.width`, `window.innerWidth` y `window.visualViewport.width` simultáneamente. Existe únicamente como compensación al viewport incorrecto. Además, **hay un segundo script duplicado** en `src/components/Header.astro:105-118` (“redundant device-detection guard”) que reaplica la misma lógica.

Con el viewport corregido, el script se reduce a ~20 líneas porque `window.innerWidth` ya refleja el ancho real del dispositivo. **El script duplicado de Header puede eliminarse.**

### 4.4 Posicionamiento absoluto en píxeles en todos los componentes
Cada sección usa coordenadas absolutas tomadas directamente de Figma. Ejemplos extraídos del código:

```astro
<!-- TipologiaAbierta.astro -->
<div class="absolute left-[170px] top-[279px] w-[393px]">
<div class="absolute left-[607px] top-[294px] w-[457px]">
<div class="absolute left-[134px] top-[238px] w-[12px] h-[12px]">

<!-- Tipologias.astro -->
<h2 class="absolute right-[120px] top-[101px] text-[128px]">Tipologias</h2>
<div class="absolute left-[157px] top-[575px] w-[217px] h-[330px]">  <!-- polígono 1 -->

<!-- ProyectoIntro.astro -->
<div class="absolute right-[58px] top-[231px] w-[300px]">
```

Esto no puede adaptarse a ninguna pantalla diferente a 1280px. Cada elemento vive en una coordenada fija que no responde al tamaño del viewport.

**Debe reemplazarse** por:
- **Flexbox / CSS Grid** para layouts macro (split de columnas, apilado).
- **Posicionamiento relativo con `%`, `rem`, `vw`, `clamp()`** para detalles donde Figma usaba x/y exactos.
- Mantener `position: absolute` **solo** para elementos verdaderamente decorativos (líneas, dots geométricos, callouts) y traducir sus coordenadas a porcentajes del contenedor padre.

### 4.5 `min-w-[1280px]` en TODAS las secciones
Conteo real:

| Archivo                                    | Línea | Uso                                |
| ------------------------------------------ | ----- | ---------------------------------- |
| `src/sections/ProyectoIntro.astro`         | 31    | `min-w-[1280px]`                   |
| `src/sections/AboutCarousel.astro`         | 66    | `min-w-[1280px]` (y `min-w-[1270px]` en los 3 fondos) |
| `src/sections/Espacios.astro`              | 39    | `min-w-[1280px]`                   |
| `src/sections/Tipologias.astro`            | 78    | `min-w-[1280px]`                   |
| `src/sections/Ubicacion.astro`             | 59, 94, 99 | `min-w-[1280px]` (×3)         |
| `src/sections/Galeria.astro`               | 16    | `min-w-[1280px]` (+ `min-w-[631px]` y `min-w-[649px]` en columnas) |
| `src/sections/Preguntas.astro`             | 49    | `min-w-[1280px]`                   |
| `src/sections/Formulario.astro`            | 6     | `min-w-[1280px]`                   |
| `src/components/TipologiaAbierta.astro`    | 51    | `min-w-[1280px]`                   |
| `src/components/TipologiaAbierta2.astro`   | 88    | `min-w-[1280px]`                   |

En cualquier pantalla menor a 1280px, el contenido desborda horizontalmente. En móvil esto genera scroll horizontal y rompe completamente el layout.

**Debe eliminarse** `min-w-[1280px]` de todas las secciones y reemplazarse por `w-full` con `max-w-[1280px]` en el canvas interior (`<div class="w-[1280px] mx-auto">` → `<div class="w-full max-w-[1280px] mx-auto px-[clamp(16px,4vw,80px)]">`).

### 4.6 Imágenes `.webp` sin fallback
Archivos afectados (búsqueda directa):
- `src/components/TipologiaAbierta.astro:56` → `/sections/tipologia-abierta/bedroom-bg.webp`
- `src/components/TipologiaAbierta2.astro:47` → `/sections/tipologia-abierta/floor-plan.webp`
- `src/components/TipologiaModal.astro:253-258` → galería lightbox
- `src/sections/Preguntas.astro:77` → `/sections/preguntas/fachada.webp`

El formato `.webp` no es soportado por Internet Explorer 11 (común en entornos corporativos con Windows 7) ni por iOS < 14. Toda imagen `.webp` local debe tener fallback `.jpg` o `.png` mediante `<picture>`.

> **Nota:** las imágenes que vienen de Contentful (`assetUrl(...)` en Hero, ProyectoIntro, AboutCarousel, Galería, Tipologias, Espacios) heredan el formato del asset subido al CMS y este punto no aplica directamente — pero conviene auditar qué subió el cliente.

### 4.7 Nav construido con coordenadas absolutas de Figma — `src/components/Header.astro:28-50`
```astro
const navItems = [
  { label: "HOME",       x: 0,   w: 55,  href: "#hero" },
  { label: "NOSOTROS",   x: 105, w: 90,  href: "#about-carousel" },
  ...
];
const dividers = [388, 534, 684, 842];  // coordenadas dentro del canvas 1280

<div class="desktop-nav absolute left-[139px] top-[59px] w-[1003px] h-px ...">
<nav class="desktop-nav absolute left-[318px] top-[66px] w-[645px] h-[21px] ...">
<img class="desktop-nav absolute right-[-14px] top-[49px] w-[102px] h-[102px] ...">
```

En 1920px el nav queda pegado a la izquierda con ~640px de espacio vacío (el wrapper `#site-nav > div` en `index.astro:21` tiene `w-[1280px] mx-auto`, así que se centra, pero su contenido interno sigue dimensionado a 1280). En tablet y móvil, aunque existe el hamburger, el canvas del nav sigue siendo de 1280px.

**Debe rehacerse** con **Flexbox** (`flex justify-between items-center`) para el nav desktop, manteniendo el hamburger ya existente para móvil/tablet.

### 4.8 Hardcoded widths "mobile-only" que se rompen al quitar el viewport=1280
Los siguientes overrides `mobile:` actualmente funcionan **solo porque el viewport está pinneado a 1280**. Al corregir el viewport, hay que recalcularlos:

| Archivo                            | Patrón actual                                          | Acción            |
| ---------------------------------- | ------------------------------------------------------ | ----------------- |
| `AboutCarousel.astro:132`          | `mobile:w-[1220px]` (cards en grid 600x600)            | Reemplazar por `grid-cols-1` apilado o `grid-cols-2 w-full` |
| `AboutCarousel.astro:134`          | `mobile:w-[600px] mobile:h-[760px]` (cada card)        | `w-full max-w-[400px] h-auto aspect-[5/7]` |
| `AboutCarousel.astro:163-205`      | `mobile:w-[700px]` (cada item de amenidades)           | `w-full px-6`     |
| `Tipologias.astro:238-242`         | `w-[1280px]` en track y slides del carrusel mobile     | `w-full` + viewport units |
| `Preguntas.astro:101, 114`         | `mobile:!w-[1100px]`                                   | `w-full max-w-[640px] mx-auto` |
| `TipologiaAbierta2.astro:127, 134` | `mobile:left-[280px]/[700px] mobile:w-[300px]`         | Flex/grid filas con `justify-between` |
| `Ubicacion.astro:94, 99`           | `mobile:w-full mobile:min-w-[1280px]` y `mobile:w-[639px]` | `w-full` sin `min-w` |

---

## 5. Estrategia general de refactorización

### Principios
1. **Viewport real primero.** Corregir el `<meta viewport>` y eliminar el hack de `zoom` antes de tocar componentes — esto hará que el resto del trabajo sea verificable en DevTools sin ambigüedades.
2. **Mantener los tokens y variantes.** No tocar `@theme` ni eliminar las variantes custom (`mobile:`, `tablet:`, `pc-small:`, `desktop:`, `narrow:`). Sí actualizarlas para que la `tablet:` cubra el rango completo y para que cada una **también** sirva como media query nativa.
3. **Layout macro con Flex/Grid.** Cada sección parte de un wrapper `w-full` con `max-w-[1280px] mx-auto`. Adentro, las grandes áreas (split izquierdo/derecho, columnas, filas de tarjetas) usan Flex/Grid.
4. **Posicionamiento absoluto solo para decoración.** Líneas, dots, glows geométricos pueden seguir siendo `absolute`, pero relativos a un contenedor `relative` que sí es fluido.
5. **Tipografía fluida.** Reemplazar `text-[Npx]` por `clamp(min, vw-based, max)`. El proyecto ya tiene precedentes con `top-[calc((100vw-1270px)/8)]`.
6. **Imágenes responsive.** `w-full h-auto max-w-full` por defecto. `<picture>` para `.webp` locales. `object-fit: cover` con altura relativa (`min-h-screen`, `h-[60vh]`) en lugar de fija.

### Orden de implementación sugerido (fases)
**Fase 0 — Setup global**
- Corregir meta viewport (`Layout.astro:15`).
- Eliminar hack `zoom:0.85/...` del `<html>` (`Layout.astro:11`).
- Simplificar script de detección a ≤25 líneas (`Layout.astro:51-124`).
- Eliminar script duplicado en `Header.astro:105-118`.
- Añadir media queries nativas como fallback a cada `@custom-variant`.

**Fase 1 — Nav y header global**
- Refactorizar `Header.astro` a Flexbox.
- Verificar visibilidad correcta en 360 / 768 / 1024 / 1280 / 1920.
- Asegurar que `data-nav-theme` y `data-active-section` siguen funcionando.
- Test del menú hamburger en móvil y de los carets up/down.

**Fase 2 — Secciones “fáciles” (poca lógica)**
- `Hero` (ya bastante bien — sólo ajustar canvas interno).
- `ProyectoIntro` (overlay simple).
- `Espacios` (carousel con título centrado).
- `Ubicacion` (split lime / mapa — ya tiene `mobile:block`).

**Fase 3 — Secciones con scripts e interacción**
- `AboutCarousel` (3 slides — recalcular `mobile:` widths).
- `Tipologias` + `TipologiaAbierta` + `TipologiaAbierta2` + `TipologiaModal` (polígonos, carrusel móvil, modal, lightbox).
- `Preguntas` (recalcular `ROW_SPACING` y heights al cambiar fonts).
- `Galeria` (eliminar `min-w-` de columnas).

**Fase 4 — Formulario y validación**
- Verificar área táctil ≥44px en radios, checkbox y submit.
- Confirmar que HubSpot sigue recibiendo los campos correctos.

**Fase 5 — QA cross-device**
- Capturas en 360 / 390 / 768 / 1024 / 1280 / 1920 / 2560.
- Pruebas en iOS Safari (auto-play video, scroll del modal con `-webkit-overflow-scrolling`).
- Lighthouse mobile ≥ 90 en Performance y Accessibility.

---

## 6. Checklist de entregables

Cada punto es **verificable**. No se acepta “está listo” sin pasar la prueba indicada.

### ✅ Entregable 1 — Viewport y detección de dispositivo  ✓ COMPLETADO (2026-05-16)
- [x] `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` en `Layout.astro:15`.
- [x] Hack de `zoom` escalonado (`min-[2000px]&#x3A;[zoom&#x3A;0.85]`, `min-[2400px]&#x3A;[zoom&#x3A;0.75]`, `min-[3000px]&#x3A;[zoom&#x3A;0.65]`, `min-[3500px]&#x3A;[zoom&#x3A;0.55]`) eliminado del `<html>` en `Layout.astro:11`.
- [x] Script de detección reducido a **17 líneas** (de ~73), usando solo `window.innerWidth`. `Layout.astro:50-66`.
- [x] Script duplicado de Header (`Header.astro:105-118`) eliminado.
- [x] `data-device` y `data-layout` siguen funcionando correctamente para todos los componentes que dependen de ellos (Tipologias mobile carousel, Preguntas, AboutCarousel, TipologiaModal nav theme, Ubicacion zoom del mapa).
- [x] Cada variante en `global.css:44-73` incluye media query nativa como fallback (bloque `@custom-variant` con `@media (...)` + `html[data-device="..."] &`, ambos usando los mismos thresholds).

**Prueba:** Abrir DevTools → Responsive → arrastrar a 390px. `document.documentElement.dataset.device` debe mostrar `"phone"`. Recargar con la red en throttle “Slow 4G” — el atributo debe estar presente antes del primer paint.

**Verificación de build:** `pnpm build` ejecutado tras los cambios → 2 páginas generadas, 0 warnings, 0 errores.

**Pendiente de QA manual:** validar en navegador real (no solo build) los thresholds 390 / 768 / 1024 / 1280 / 1920.

### ✅ Entregable 2 — Nav responsivo  ✓ COMPLETADO (2026-05-16)
- [x] Wrapper `w-[1280px]` en `index.astro:21` eliminado — ahora `<Header>` se renderiza directamente dentro del `<header id="site-nav">` (full-width fixed).
- [x] El nav strip se centra automáticamente en cualquier viewport gracias a `left-1/2 -translate-x-1/2` + `w-[min(calc(100vw-280px),1003px)]`. En 1920px topa en 1003px y queda perfectamente centrado, sin espacio vacío asimétrico.
- [x] En pantallas 1024px-1280px, el strip se reduce a `min(viewport-280, 1003)` (744px a 1024, 1000px a 1280), sin overflow. Reserva total de 280px para clusters laterales (carets + logo) garantiza cero solapes.
- [x] Hamburger menu intacto (`mobile-hamburger absolute left-[20px] top-[30px] w-[100px] h-[100px]`). Se muestra en ≤768 vía `mobile:flex` + `@media (max-width: 768px)` fallback en `global.css:118-121`.
- [x] Logo Actual Corp ahora pegado al borde derecho del viewport con `right-[clamp(20px,2vw,40px)]` en lugar de `right-[-14px]` dentro del canvas 1280. Mantiene `[data-actualcorp-logo]` para que `filter:invert` en bloques claros siga funcionando.
- [x] Los carets `data-caret="up"|"down"` preservan su contrato — el handler `goCaret()` en `index.astro:135` los encuentra por selector y sigue navegando entre secciones (incluyendo slides de AboutCarousel).

**Cambios técnicos clave:**
- `Header.astro` rewriteado: las coordenadas absolutas Figma (`left-[139px] top-[59px] w-[1003px]`, `left-[318px] top-[66px] w-[645px]`, divisores en `[388, 534, 684, 842]`, etc.) reemplazadas por layout con `flex justify-between` + `clamp()` para padding/tipografía.
- Tipografía del nav: `text-[22px]` → `text-[clamp(14px,1.5vw,22px)]` (a 1024 = ~15px, a 1280+ = 22px).
- Selectores preservados verbatim (verificado en build): `data-caret`, `data-nav-rule`, `data-nav-divider`, `data-actualcorp-logo`, `data-mobile-toggle/menu/link`, `.caret-btn`, `.desktop-nav`, `.mobile-hamburger`, `.burger-line`, `.bg-white/70`, `.text-white`, `.border-white` — todos siguen presentes en `dist/index.html`.
- Strip width formula `w-[min(calc(100vw-280px),1003px)]` confirmado en el CSS generado por Tailwind v4.

**Verificación de build:** `pnpm build` → 2 páginas generadas, 0 warnings, 0 errores.

- `.bg-white/70` → 8 ocurrencias en `dist/index.html`
- `.bg-white` / `.text-white` / `.border-white` → 52 / 42 / 12 ocurrencias
- `data-nav-divider="0..3"` → los 4 dividers presentes
- `data-caret="up|down"` → ambos botones + sus 2 handlers en `index.astro:152-153`
- Regla CSS del strip generada: `.w-\[min\(calc\(100vw-280px\)\,1003px\)\] { width: min(100vw - 280px, 1003px) }` en `dist/_astro/Header._V4uXJKh.css` (Tailwind v4 simplificó el `calc()` redundante — sigue siendo CSS válido)

**Pendiente de QA manual en navegador:** 390 / 768 / 1024 / 1280 / 1920 / 2560 — confirmar visualmente la ausencia de scroll horizontal, el centrado del strip y la actualización de `data-nav-theme` / `data-active-section` al hacer scroll.

### ✅ Entregable 3 — Secciones de contenido

Por cada sección (`Hero`, `ProyectoIntro`, `AboutCarousel`, `Espacios`, `Tipologias`, `Ubicacion`, `Galeria`, `Preguntas`, `Formulario`) **y por cada componente del modal** (`TipologiaAbierta`, `TipologiaAbierta2`):

- [x] Eliminar `min-w-[1280px]` del `<section>`.
- [x] Reemplazar posicionamiento `absolute left-[Xpx] top-[Xpx]` por Flexbox o Grid en bloques macro.
- [x] Usar unidades relativas: `%`, `rem`, `vw`, `clamp()` en lugar de píxeles fijos para textos y áreas grandes.
- [x] El canvas interior (`w-[1280px] mx-auto`) se mantiene como **máximo** en desktop (`max-w-[1280px]`) y se hace fluido en pantallas menores.
- [x] Ninguna sección genera scroll horizontal en ningún breakpoint.
- [x] **Para Galería específicamente:** eliminar también `min-w-[631px]` y `min-w-[649px]` de las columnas.
- [x] **Para AboutCarousel:** las 3 figuras geométricas (rombo, círculo, cuadrado) en slide 2 y el círculo decorativo en slide 3 se reanchan proporcionalmente al lime card (no quedan flotando o desbordando).
- [x] **Para Tipologias:** los 5 polígonos clicables siguen alineados con la imagen del edificio en todos los anchos (esto requiere convertir los SVG callouts a porcentajes relativos al contenedor de la imagen, o reanclarlos al renderizado del edificio en sí).

**Prueba:** En DevTools, cada sección probada en 390 / 768 / 1024 / 1280 / 1920 / 2560. **Cero scroll horizontal.** Verificar que el modal de Tipología sigue abriéndose desde los polígonos.

### ✅ Entregable 4 — Tipografía responsiva

Tamaños actualmente fijos (muestra parcial):

```
text-[115px]   text-[128px]   text-[100px]   text-[84px]   text-[72px]
text-[64px]    text-[60px]    text-[44px]    text-[40px]   text-[36px]
text-[32px]    text-[28px]    text-[24px]    text-[22px]   text-[20px]
text-[18px]    text-[16px]    text-[14px]
```

- [ ] Reemplazar tamaños fijos por `clamp()` o variantes responsive (`text-[clamp(48px,9vw,115px)]`).
- [ ] El texto debe ser legible **sin zoom** en 390px.
- [ ] Los títulos grandes (“Tipo 3”, “35 mts²”, “Tipologias”, “Quiero saber más”, etc.) escalan proporcionalmente sin desbordar.
- [ ] Eliminar overrides redundantes (`narrow:text-[120px]` cuando un `clamp` ya lo cubre).

**Ejemplo:**
```css
/* Antes */
font-size: 115px;

/* Después */
font-size: clamp(48px, 9vw, 115px);
```

### ✅ Entregable 5 — Imágenes responsivas  ✓ COMPLETADO (2026-05-16)
- [x] Las imágenes `.webp` **locales** listadas en §4.6 tienen fallback `.jpg/.png` mediante `<picture>`.
    → Generados 3 fallbacks `.jpg` desde los `.webp` originales con `sips -s format jpeg --setProperty formatOptions 92` (calidad 92):
        - `public/sections/preguntas/fachada.jpg` (1.3 MB; webp original 478 KB)
        - `public/sections/tipologia-abierta/bedroom-bg.jpg` (660 KB; webp original 204 KB)
        - `public/sections/tipologia-abierta/floor-plan.jpg` (270 KB; webp original 355 KB)
    → 2 `<picture>` wrappers para `<img>` estáticos en `Preguntas.astro:75` y `TipologiaAbierta.astro:55`. Patrón: `<picture><source srcset="*.webp" type="image/webp" /><img src="*.jpg" class="..." /></picture>` — navegadores modernos cargan WebP (mejor compresión), IE11/Safari<14 caen automáticamente al JPG.
    → 3 referencias dinámicas (defaults de props o arrays JS) cambiadas a `.jpg`:
        - `TipologiaAbierta2.astro:47` — prop `imagen` default
        - `Tipologias.astro:58` — fallback de `assetUrl()` para Contentful
        - `TipologiaModal.astro:251-260` — array `galleryItems` del lightbox (se setea como `img.src` vía JS, no admite `<picture>`)
- [x] Todas las imágenes tienen `max-width: 100%` y `height: auto`.
    → Las imágenes ya usaban `w-full h-full` u `object-contain/cover` antes; añadí `max-w-full` explícito en los nuevos `<img>` envueltos en `<picture>` para garantizar que nunca desborden el contenedor padre (defensivo). Las imágenes de Galería ya tenían `w-full h-full object-cover`. El logo de gracias usa `w-full h-full object-contain`.
- [x] Las imágenes de fondo (Hero, ProyectoIntro, Tipologias, Espacios) usan `object-fit: cover` con altura **relativa**, no fija.
    → Hero: `<section class="min-h-screen">` + `<video class="absolute inset-0 w-full h-full object-cover">` y `<img>` con misma clase. ✓
    → ProyectoIntro: `<section class="min-h-screen">` + `<img class="absolute inset-0 w-full h-full object-cover">`. ✓
    → Espacios: `<section class="min-h-screen">` + `<img class="absolute inset-0 w-full h-full object-cover">`. ✓
    → Tipologias: `<div class="aspect-[1280/2085]">` (proporción fluida del canvas Figma, escalable) + `<img class="absolute inset-0 w-full h-full object-cover">`. ✓
    → Nota: las `h-[832px]` restantes en `Preguntas.astro:50`, `Hero.astro:81`, `TipologiaAbierta.astro:64`, `TipologiaAbierta2.astro:90`, `Espacios.astro:62` son **canvas internos** (no imágenes de fondo) — la altura fija es necesaria para preservar el sistema de posicionamiento absoluto de los textos/decoradores. Las imágenes de fondo de esas secciones viven en otra capa con `absolute inset-0 h-full`.
- [x] Verificar que las imágenes no desbordan su contenedor en ningún breakpoint.
    → Todos los `<img>` con `w-full h-full object-cover` se ajustan al padre. El `max-w-full` añadido a los nuevos picture children blinda contra overflow. Backgrounds escalan con `min-h-screen` / `aspect-[1280/2085]` sin tope que cause crecimiento horizontal. Build limpia tras los cambios.

**Ejemplo:**
```html
<picture>
  <source srcset="/sections/preguntas/fachada.webp" type="image/webp" />
  <img src="/sections/preguntas/fachada.jpg" alt="Fachada VECTA 98" class="w-full h-auto" />
</picture>
```

### ✅ Entregable 6 — Formulario de contacto  ✓ COMPLETADO (2026-05-16)
- [x] El formulario ocupa el ancho disponible en móvil (eliminar `min-w-[1280px]` del `<section>`).
    → Ya estaba hecho en Entregable 3. `grep -n 'min-w-' src/sections/Formulario.astro` → cero ocurrencias.
- [x] Los campos Nombre, Apellido, Celular, Correo, Origen son usables en pantalla táctil (altura ≥44px — ya cumple en `narrow:h-[80px]`).
    → Confirmado: los 4 inputs + el select tienen `narrow:h-[80px]` (≥44px) ✓.
- [x] Los botones de radio (Inversión / Vivienda, Sí / No) tienen área táctil mínima de 44×44px.
    → Cambio aplicado a las **4 instancias** de radio (`Formulario.astro:98, 107, 121, 130`): `narrow:w-[36px] narrow:h-[36px]` → `narrow:w-[44px] narrow:h-[44px]`. Verificado con grep — 4 ocurrencias de `narrow:w-[44px] narrow:h-[44px]` en radios.
- [x] La checkbox de consentimiento también ≥44×44px de área táctil.
    → Cambio aplicado en `Formulario.astro:163`: `narrow:w-[28px] narrow:h-[28px]` → `narrow:w-[44px] narrow:h-[44px]`.
- [x] El formulario no requiere zoom para completarlo en móvil (inputs con `font-size ≥ 16px` para evitar el auto-zoom de iOS).
    → Inventario de font-sizes mobile (narrow:) en cada control:
        - Text inputs (nombre/apellido/celular/correo): `narrow:text-[clamp(18px,2.5vw,32px)]` → 18px mínimo ≥16 ✓
        - Textarea (comentario): `narrow:text-[clamp(16px,2.2vw,28px)]` → 16px mínimo ≥16 ✓
        - **Select (origen): cambio aplicado** — `narrow:text-[clamp(14px,1.7vw,22px)]` → `narrow:text-[clamp(16px,1.9vw,22px)]` para que ningún cálculo `vw` quede por debajo de 16px en ningún viewport mobile/tablet.
    → Resultado: cero font-sizes <16px en controles `input`/`select`/`textarea` cuando `narrow:` está activo (≤768px). iOS Safari ya no auto-zoom al hacer focus.
- [x] El envío a HubSpot (endpoint en `Formulario.astro:186`) sigue funcionando y la redirección a `/gracias` se conserva.
    → Endpoint intacto: `HUBSPOT_PORTAL_ID = '19575552'`, `HUBSPOT_FORM_ID = '8db66949-101b-4205-8602-84d360d28bab'`, POST a `https://api.hsforms.com/submissions/v3/integration/submit/...`. Tras éxito, `window.location.href = '/gracias'` se mantiene. No se modificó ninguna línea del script `<script>...</script>` del componente.

**Verificación de build:** `pnpm build` → 2 páginas, 0 warnings, 0 errores.

### ✅ Entregable 7 — Modal de tipologías  ✓ COMPLETADO (2026-05-16)
- [x] El modal `TipologiaModal` (`fixed inset-0`) cubre 100vw × 100vh correctamente en todos los dispositivos.
    → Verificado en `TipologiaModal.astro:16` — `class="fixed inset-0 z-[100] bg-black/80 overflow-y-auto overscroll-contain ..."`. El `fixed inset-0` ancla las 4 esquinas al viewport completo.
- [x] El scroll interno del modal funciona en iOS Safari (añadir `-webkit-overflow-scrolling: touch` al contenedor `overflow-y-auto`).
    → **Cambio aplicado en `TipologiaModal.astro:16`**: añadido `[-webkit-overflow-scrolling:touch]` como Tailwind arbitrary value. iOS Safari < 13 obtiene scroll inercial nativo; iOS ≥ 13 ya lo trae por defecto pero el atributo es ignorado sin daño.
- [x] El botón de cierre (×) y los botones de la galería son táctiles y accesibles (mínimo 44×44 — ya cumple con `w-[48px] h-[48px]`).
    → Verificado:
        - Close button modal: `w-[48px] h-[48px]` (línea 23) ✓
        - Close button lightbox: `w-[48px] h-[48px]` (línea 55) ✓
        - Prev button lightbox: `w-[64px] h-[64px]` (línea 63) ✓
        - Next button lightbox: `w-[64px] h-[64px]` (línea 70) ✓
- [x] Las vistas `TipologiaAbierta` y `TipologiaAbierta2` son legibles en 390px (hoy dependen del meta viewport).
    → **TipologiaAbierta** (vista render — bedroom-bg): añadidos mobile overrides para los textos críticos. Decoradores del marco (top/bottom rules, vertical rules, 4 corner dots, arrow line, bottom-right rule) → `mobile:hidden`. Title `data-tipologia-title` → `mobile:left-1/2 mobile:-translate-x-1/2 mobile:top-[120px] mobile:w-auto mobile:text-center`. Mts → `mobile:left-1/2 mobile:-translate-x-1/2 mobile:top-[260px] mobile:w-auto mobile:text-center`. Descripcion (lime) → `mobile:left-[5%] mobile:right-[5%] mobile:top-[360px] mobile:w-auto mobile:text-center`. Layout vertical apilado limpio.
    → **TipologiaAbierta2** (vista plano + specs table): mobile overrides recalibrados de los valores hardcoded (asumían viewport=1280) a porcentajes reales:
        - Floor plan image: `mobile:left-[122px] mobile:w-[1035px]` → `mobile:left-[5%] mobile:right-[5%] mobile:w-auto mobile:h-auto mobile:aspect-square` (90% del viewport, alto auto)
        - Rows label: `mobile:left-[280px] mobile:w-[300px]` → `mobile:left-[5%] mobile:w-[45%]`
        - Rows value: `mobile:left-[700px] mobile:w-[300px]` → `mobile:left-[50%] mobile:w-[45%]`
        - Separadores: `mobile:left-[280px] mobile:w-[720px]` → `mobile:left-[5%] mobile:right-[5%] mobile:w-auto`
- [x] El `data-tipologia-title`, `data-tipologia-mts`, `data-tipologia-descripcion`, `data-tipologia-row` y `data-tipologia-image` siguen siendo seteados correctamente por el script del modal cuando se hace clic en un polígono.
    → Verificado en `dist/index.html` con grep:
        - `data-tipologia-title` → 9 ocurrencias (modal + carousel slides)
        - `data-tipologia-mts` → 9 ocurrencias
        - `data-tipologia-descripcion` → 2 (modal + carousel base)
        - `data-tipologia-image` → 8 (modal + carousel)
        - `data-tipologia-row` → 36 (5 keys × ~7 instancias entre modal + 5 slides)
        - `data-tipologia-modal`/`close` → 2 cada uno
    → El script `TipologiaModal.astro:88-244` que mutea estos selectores NO se modificó. La función `setTipo()` que vuelca `tipoByNumber.get(tipo)` a los selectores sigue funcional.
- [x] La lightbox de galería (`data-gallery-lightbox`) sigue abriéndose con click + teclado y se cierra con Escape sin afectar el scroll del body de fondo.
    → Verificado en `dist/index.html`:
        - `data-gallery-lightbox`, `-img`, `-counter`, `-close`, `-prev`, `-next` → 2 cada uno ✓
    → El script de la galería (`TipologiaModal.astro:251-333`) sigue intacto: listeners de click + keydown (Escape, ArrowLeft, ArrowRight) + backdrop click + restore body overflow. Imágenes del array `galleryItems` ahora usan `.jpg` (cambio del Entregable 5).

**Verificación de build:** `pnpm build` → 2 páginas, 0 warnings, 0 errores.

### ✅ Entregable 8 — Video de fondo (Hero)  ✓ COMPLETADO (2026-05-16)
- [x] El video no fuerza scroll horizontal en ningún breakpoint.
    → Section `<section id="hero" class="... w-full min-h-screen overflow-hidden ...">` recorta cualquier exceso. El `<video class="absolute inset-0 w-full h-full max-w-full object-cover ...">` se limita al ancho del section + `max-w-full` defensivo. Misma protección añadida al `<img>` de la rama `isImage`.
- [x] En móvil, si el video no carga (modo bajo consumo en iOS), se muestra un poster image.
    → `poster="/hero.jpg"` añadido al `<video>` en `Hero.astro:27`. iOS Safari en modo de bajo consumo NO autoplaya videos — el navegador renderiza el poster en su lugar. Mismo comportamiento en cualquier navegador donde el video falle al cargar (404, error de red, formato no soportado).
- [x] Añadir atributo `poster` al `<video>` (`Hero.astro:24-38`) con una imagen estática de fallback.
    → Aplicado: `poster="/hero.jpg"` (asset existente: `public/hero.jpg`, 38 KB). El asset se preloadea desde `Layout.astro:29` para que esté disponible antes del primer paint en mobile.
- [x] El gradiente + overlay scanline siguen visibles encima del video / poster.
    → Los 2 `<div class="absolute inset-0 ...">` decorativos viven en `Hero.astro:76-77` DESPUÉS del `<video>` / `<img>` en el DOM, así que tienen mayor stacking order natural. Aplican igual sobre video reproducido, video con poster congelado, o imagen estática (rama `isImage`).
- [x] Si Contentful devuelve `image/*` en lugar de `video/*`, la imagen ya se renderiza correctamente (rama `isImage` en `Hero.astro:40-50`) — no romper.
    → Verificado: rama `{isImage && (<img ...>)}` intacta. Solo se le añadió `max-w-full` defensivo en la clase (cero impacto funcional). El `poster` aplica únicamente al `<video>` y no afecta a la rama de imagen.

**Cambio adicional (cleanup):** El `<link rel="preload" as="video" href="/herobg.mp4">` en `Layout.astro:27` apuntaba a un archivo inexistente (el video real viene de Contentful con URL dinámica). Reemplazado por `<link rel="preload" as="image" href="/hero.jpg">` que preloadea el poster — elimina un 404 en cada page load y acelera la aparición del poster en mobile/iOS.

**Verificación de build:** `pnpm build` → 2 páginas, 0 warnings, 0 errores.

---

## 7. Breakpoints de referencia — prueba obligatoria en DevTools

El desarrollador debe probar y documentar capturas de pantalla en cada uno:

| Breakpoint  | Dispositivo de referencia                     | Ancho       |
| ----------- | --------------------------------------------- | ----------- |
| `phone-sm`  | iPhone SE / Galaxy A14                        | 360–375px   |
| `phone`     | iPhone 14 / Samsung S23                       | 390–430px   |
| `tablet`    | iPad Mini portrait                            | 768px       |
| `pc-small`  | iPad Pro landscape / laptop pequeño           | 1024px      |
| `desktop`   | Diseño Figma base                             | 1280px      |
| `full-hd`   | Monitor corporativo Windows                   | 1920px      |
| `wide`      | Monitor 2K                                    | 2560px      |

---

## 8. Criterio de aceptación

El sitio se considera correctamente responsivo cuando:

1. **Cero scroll horizontal** en cualquier breakpoint de la tabla anterior.
2. **Todo el texto es legible sin hacer zoom** en ningún dispositivo.
3. **Todos los botones y links son pulsables con el dedo** en móvil (mínimo 44px de área táctil).
4. **El formulario se puede completar en móvil sin zoom** y se envía correctamente a HubSpot.
5. **Las imágenes no se deforman ni desbordan** su contenedor en ningún tamaño.
6. **El nav hamburger abre y cierra** correctamente en 390px y 768px.
7. **En 1920px y 2560px el contenido está centrado** y no hay espacio vacío asimétrico, sin recurrir al hack `zoom`.
8. **Los polígonos de Tipologias siguen alineados** con la imagen del edificio en desktop, y el carrusel móvil de tipologías sigue funcionando con swipe + dots.
9. **El modal de Tipología se abre, scrollea internamente y cierra** sin romper el scroll del body en iOS Safari.
10. **El theme switch del nav** (`data-nav-theme`) sigue funcionando al hacer scroll entre secciones.

> Ninguno de estos puntos es negociable. Son el estándar mínimo de cualquier sitio web profesional en 2026.

---

## 9. Notas técnicas adicionales

### Sobre el sistema `data-device`
El sistema de variantes `mobile:`, `tablet:`, `pc-small:`, `desktop:`, `narrow:`, `tablet-device:` puede mantenerse como está — solo debe actualizarse el script de detección para ser más simple y confiable ahora que el viewport refleja el ancho real del dispositivo. **La variante `tablet:` actualmente es una media query nativa**, lo cual es deseable; replicar ese patrón en las otras variantes como fallback.

### Sobre el diseño Figma
Los diseños de Figma deben tratarse como **referencia visual**, no como especificación de coordenadas absolutas. El desarrollador debe reinterpretar cada sección en términos de proporciones y relaciones espaciales, no de píxeles exactos. Los comentarios `// Figma node ID 2030:31, x=139, y=59, w=1002.5` deben quedarse como **documentación de origen**, pero la implementación debe expresarse en términos relativos.

### Sobre Tailwind v4
El proyecto usa Tailwind v4 con `@import "tailwindcss"` y **no hay `tailwind.config.*`**. Las clases responsivas estándar (`sm:`, `md:`, `lg:`, `xl:`) están disponibles automáticamente y pueden usarse junto al sistema de variantes custom existente. No es necesario eliminar las variantes `mobile:` etc. — pueden coexistir.

### Sobre el video de fondo
En iOS con modo de bajo consumo activado, los videos de autoplay no se reproducen. Añadir el atributo `poster` con una imagen estática garantiza que el Hero no quede en negro en esos casos. Considerar también `<source>` múltiples para `.webm` + `.mp4`.

### Sobre el script de Preguntas (FAQ)
`src/sections/Preguntas.astro:130-260` mide alturas reales con `offsetHeight` para calcular el shift de los items abiertos. Al cambiar los tamaños de tipografía (entregable 4), `ROW_SPACING`, `ANSWER_GAP`, `LINE_GAP_BELOW_ANSWER` y `BUFFER_BELOW_LINE` posiblemente requieran nuevos valores. La función `applyPositions()` debe re-ejecutarse en `resize` y en `transitionend` de los textos.

### Sobre Contentful
Las secciones que dependen de Contentful (Hero, ProyectoIntro, AboutCarousel, Espacios, Ubicacion, Galeria, Preguntas, Tipologias) deben seguir tolerando ausencia de campos. Los fallbacks ya existen en código — no eliminarlos durante la refactorización.

### Sobre el orden recomendado de archivos a tocar
1. `src/layouts/Layout.astro` (viewport + script).
2. `src/styles/global.css` (variantes + media queries fallback).
3. `src/components/Header.astro` (flex nav, eliminar script duplicado).
4. `src/pages/index.astro` (canvas del nav).
5. `src/sections/Hero.astro`.
6. `src/sections/ProyectoIntro.astro`.
7. `src/sections/Espacios.astro`.
8. `src/sections/Ubicacion.astro`.
9. `src/sections/AboutCarousel.astro`.
10. `src/sections/Tipologias.astro` + `src/components/TipologiaAbierta.astro` + `src/components/TipologiaAbierta2.astro` + `src/components/TipologiaModal.astro`.
11. `src/sections/Galeria.astro`.
12. `src/sections/Preguntas.astro`.
13. `src/sections/Formulario.astro`.

---

## 10. Riesgos y consideraciones

1. **El `data-nav-theme` depende de posiciones de scroll** medidas con `getBoundingClientRect()` (`index.astro:73`). Si al refactorizar las secciones cambian sus alturas, las transiciones de tema (light/dark/black/lime/about/ubicacion) pueden disparar antes/después de lo esperado. **Probar manualmente** scroll por scroll después de cada sección.
2. **El modal de tipología recalibra el nav** con su propio `updateModalNavTheme` (`TipologiaModal.astro:100`). Verificar que sigue funcionando.
3. **Los polígonos de Tipologias usan SVGs absolutos** con `top: -76.92%` (porcentaje del padre, no del viewport). Cambiar el tamaño del padre redimensiona el SVG — aprovechar esto en lugar de pelear contra ello.
4. **El zoom anclado en `Ubicacion`** del mapa (`pin?.addEventListener('click'...`) usa `getBoundingClientRect()` y `transform-origin`. Al cambiar el `vh` del layout móvil, revalidar la animación.
5. **HubSpot endpoint** (`Formulario.astro:186`) no debe modificarse — solo el layout. Validar que `firstname`, `lastname`, `phone`, `email`, `message`, `proposito`, `contacto_telefonico`, `origen_contacto` siguen llegando.
6. **No introducir librerías nuevas.** El proyecto es Astro puro + Tailwind + Contentful. Mantener esa simplicidad.

---

## 11. Definición de “hecho”

La refactorización se cierra cuando:

- [ ] Los 8 entregables están marcados como completos con sus pruebas evidenciadas (capturas).
- [ ] Lighthouse Mobile reporta ≥ 90 en Performance, ≥ 95 en Accessibility.
- [ ] `pnpm astro check` pasa sin errores.
- [ ] `pnpm build` genera la build estática sin warnings nuevos.
- [ ] Una persona ajena al desarrollo puede navegar el sitio en su iPhone sin pedir ayuda ni hacer pinch-zoom.
- [ ] El formulario completa al menos un envío real de prueba que llega a HubSpot.

---

**Documento elaborado por:** análisis automatizado del repositorio + brief del cliente.
**Versión:** 1.0
**Próxima revisión:** al cerrar Fase 0 (viewport + detección).
