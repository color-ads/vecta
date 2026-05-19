# Auditoría Responsive — VECTA 98 (estado actual)

**Fecha:** 2026-05-18
**Objetivo:** mapear todo el `px` que queda en el proyecto, decidir qué convertir a `%`/`vw`/`vh`/`clamp()` y qué dejar en `px` por buenas razones.
**Documentos hermanos:**
- `REFACTOR-RESPONSIVE.md` — estrategia general (cambios al viewport, layout, fases macro).
- `PX-TO-PERCENT-PLAN.md` — plan inicial (parcialmente aplicado: Espacios, AboutCarousel slide 1 y 3, ProyectoIntro, Ubicacion, Formulario PC + tablet).
- **Este doc** — auditoría actualizada y plan de cierre.

---

## 1. Estado general

| Estado | % aproximado |
|---|---|
| Ya responsivo (`%`, `vw`, `vh`, `clamp`, `calc`) | **68%** |
| Convertible pendiente | **24%** |
| `px` legítimo (decoración / target táctil / UI controls) | **8%** |

**El proyecto ya está maduro.** Lo que falta son focos concretos, no un refactor masivo.

---

## 2. Reglas que NO se rompen (decisiones arquitectónicas)

Antes de convertir nada, recordar las invariantes del proyecto:

1. **`<meta viewport="width=1280">` sigue activo** en `src/layouts/Layout.astro`. Mientras no se quite, todo `px` y `vw` en mobile se calcula sobre 1280 layout (no sobre el ancho real del dispositivo). Por eso siempre necesitamos overrides `mobile:`/`tablet:`/`narrow:`.
2. **`min-h-screen` en secciones NO se quita.** Sin esto, las secciones colapsan a 0px porque sus hijos son `absolute`.
3. **`min-w-[639px]`** del panel lime en Ubicacion sigue siendo necesario (evita que el texto desborde el panel en pantallas medias).
4. **Variantes Tailwind v4 personalizadas** ya están establecidas en `src/styles/global.css` — usar siempre las existentes (`mobile`, `tablet`, `narrow`, `pc-small`, `desktop`) más `min-[Npx]:` para custom (ej. 4K con `min-[2400px]:`).

---

## 3. Lo que `px` se queda (regla mnemónica)

| Caso | Por qué |
|---|---|
| **Líneas decorativas 1–2px** (borders, dividers, scanlines) | Una línea al 0.1% se ve borrosa. |
| **Iconos < 32px** (dots, chevrons, hamburger lines, SVGs ornamentales) | Deben ser pixel-perfect. |
| **Target táctil 40–48px** (botones, carets de nav, modal close, pin del mapa, inputs `h-[47px]`) | WCAG mínimo 44px — no puede achicarse. |
| **Gaps pequeños** (`gap-[12px]`, `gap-[16px]`, paddings de form fields `p-[14px]`) | Consistencia UI, no varía con resolución. |
| **Border-radius** (`rounded-[10px]`) | Estética uniforme. |
| **Shadows** (`shadow-[0_4px_12px]`) | No escalar. |
| **Radio/checkbox controls** (`w-[18px] h-[18px]`) | Form controls nativos. |
| **Border 5px del polígono Tipologías** | Decoración deliberada. |

**Memorizar:** *"¿Lo medirías con regla y debería quedar igual en cualquier pantalla? → `px`. ¿Debería crecer con la pantalla? → `%`/`vw`/`clamp()`."*

---

## 4. Pendientes por archivo (lo que SÍ convertir)

### 4.1 `src/components/Header.astro`

| Snippet actual | Propuesto | Línea aprox. |
|---|---|---|
| `w-[102px] h-[102px]` (logo actualcorp) | `w-[clamp(80px,8vw,120px)] aspect-square` | 81 |
| `h-[4px]` (líneas burger en mobile) | mantener — es ícono < 32px | 121-123 |
| `w-[36px] h-[36px]` (carets) | mantener — target táctil | 56, 66 |

**Impacto:** chico. El logo actualcorp queda fluido pero proporcional.

---

### 4.2 `src/components/TipologiaAbierta.astro`

Canvas 1280×832. El layout PC tiene varias posiciones absolutas en px.

| Snippet actual | Propuesto |
|---|---|
| `left-[110px] top-[244px]` (intro) | `left-[8.59%] top-[29.33%]` |
| `w-[917px] h-[354px]` (intro panel) | `w-[71.64%] h-[42.55%]` |
| `left-[110px] top-[622px]` (subtitle) | `left-[8.59%] top-[74.76%]` |
| Dots `w-[12px] h-[12px]` | mantener — UI control |
| Marco decorativo 1-2px | mantener |

---

### 4.3 `src/components/TipologiaAbierta2.astro`

Canvas 1280×832 (PC). Mobile/tablet ya están en `%`/vh.

| Snippet actual | Propuesto |
|---|---|
| `left-[544px] top-[94px] w-[686px] h-[702px]` (floor plan) | `left-[42.5%] top-[11.30%] w-[53.59%] h-[84.38%]` |
| `left-[92px] top-[272px] w-[311px]` (título Tipo N) | `left-[7.19%] top-[32.69%] w-[24.30%]` |
| `style={top: ${ROW_TOPS[idx]}px}` (filas tabla) | dejar — son dinámicos en JS |
| `left-[93px] w-[194px]` (labels) | `left-[7.27%] w-[15.16%]` |
| `left-[345px] w-[133px]` (values) | `left-[26.95%] w-[10.39%]` |
| `left-[88px] w-[390px]` (separadores) | `left-[6.88%] w-[30.47%]` |

---

### 4.4 `src/components/TipologiaModal.astro`

| Snippet actual | Propuesto |
|---|---|
| `w-[48px] h-[48px]` close button | mantener — target táctil 48px |
| `w-[64px] h-[64px]` nav buttons | `w-[clamp(48px,5vw,80px)] aspect-square` |
| `top-[24px] right-[24px]` close | mantener — offset de UI |

---

### 4.5 `src/sections/Hero.astro`

Hero **ya está 95% en `%`**. Solo quedan los offsets de líneas decorativas que ya están como comentarios Figma. Cero pendientes reales.

---

### 4.6 `src/sections/ProyectoIntro.astro`

**Sin pendientes.** Solo quedan `mt-[50px]` y `mt-[12px]` (gaps de párrafos = no convertir).

---

### 4.7 `src/sections/AboutCarousel.astro`

Slide 1, 2 y 3 ya convertidos en sesiones anteriores. Pendientes mínimos:

| Snippet actual | Propuesto |
|---|---|
| `left-[60px]` (dots slide 1) | `left-[4.69%]` |
| `gap-[14px]` (dots) | mantener — gap chico |
| `w-[14px] h-[14px]` (dots) | mantener — UI control |
| `-left-[207px] -top-[157px] w-[620px] h-[620px]` (círculo deco slide 3) | `-left-[16.17%] -top-[18.87%] w-[48.44%] aspect-square` |

---

### 4.8 `src/sections/Espacios.astro`

**Sin pendientes.** Figuras geométricas ya en `%` + `aspect-square`. Botones `w-[76px]` son target táctil (no convertir).

---

### 4.9 `src/sections/Tipologias.astro`

**Polígonos y callouts ya están en `%`.** Solo SVGs decorativos (flechas) están en px — eso es correcto.

Único pendiente:
| Snippet actual | Propuesto |
|---|---|
| `border-[5px]` (caja Tipo 6) | mantener — decoración deliberada |

---

### 4.10 `src/sections/Ubicacion.astro`

| Snippet actual | Propuesto |
|---|---|
| `w-[50px] h-[50px]` (pin del mapa) | mantener — target táctil sobre el marker rojo |
| `left-[calc(50%-171px)]` (bracket vertical) | dejar — calc dinámico válido |
| `top-[106px] h-[728px]` (bracket vertical) | `top-[10.6%] h-[72.8%]` (ya hecho) |
| Dots `w-[12px] h-[12px]` | mantener |
| Override 4K mapa/lime (`min-[2400px]:`) | dejar como está — ya optimizado |

---

### 4.11 `src/sections/Galeria.astro`

**Cero pendientes.** Toda la sección ya usa `vw`, `vh`, `calc()`. Botones 40-56px son target táctil.

---

### 4.12 `src/sections/Preguntas.astro`

Decoración estática ya en `%`. Pendiente importante: **el script JS del FAQ usa `px` con `offsetHeight`**.

| Snippet actual | Propuesto | Notas |
|---|---|---|
| Decoraciones (título, lines, dots, fachada) | ya en `%` ✅ | hecho |
| `CLOSED_TOPS = [313, 386, 459, 532, 605]` (PC) | mantener en px | el script usa `offsetHeight` para calcular shift dinámico — pasar a `%` requiere refactor profundo |
| Mobile uso de `vh` para fachada | ya hecho ✅ | |
| `w-[36px] h-[36px]` (carets FAQ) | mantener — target táctil | |

**Decisión documentada:** los items del accordion se quedan en `px` por riesgo/beneficio. La animación funciona bien y mezclar `%` con `offsetHeight` en JS es frágil.

---

### 4.13 `src/sections/Formulario.astro`

**PC + tablet + mobile ya tienen overrides completos.** Pendientes solo:

| Snippet actual | Propuesto |
|---|---|
| `h-[47px]` (inputs PC) | mantener — target táctil ≥44px |
| `w-[22px] h-[23px]` (radio) | mantener — form control |
| `w-[18px] h-[18px]` (checkbox) | mantener — form control |
| `p-[14px]` (padding inputs) | mantener — legibilidad |

**Sin conversiones pendientes** — el form ya escala correctamente entre PC/tablet/mobile.

---

## 5. Prioridad de implementación

### 🟢 Alta (mejora visible, riesgo bajo)

1. **TipologiaAbierta.astro** — posiciones del marco/panel/subtítulo a `%`.
2. **TipologiaAbierta2.astro** — floor plan + título + tabla a `%` del canvas.
3. **AboutCarousel.astro** — círculo decorativo del slide 3, dots del slide 1.

### 🟡 Media (mejoras semánticas, baja prioridad visual)

4. **Header.astro** — logo actualcorp a `clamp()`.
5. **TipologiaModal.astro** — nav buttons 64px a `clamp()`.

### 🔴 No tocar (alto riesgo, bajo retorno)

- **Preguntas.astro** script JS del FAQ — funciona, romperlo es caro.
- Cualquier `target táctil`, `border 1-2px`, `gap < 20px`.

---

## 6. Patrón de conversión rápida

Para CADA posición `top-[Xpx]` o `left-[Xpx]` o `w-[Xpx]`:

```
% = (X / canvas_dimension) × 100
```

| Canvas | Dimensión a usar |
|---|---|
| Header global | 1280 ancho |
| Hero | 1280 × 832 |
| ProyectoIntro | 1280 × 832 |
| AboutCarousel | 1280 × 812 (slide 1) / 832 (slide 2-3) |
| Espacios | 1280 × 832 |
| Tipologias (PC) | 1280 × 2085 |
| Tipologias slide (modal carrusel) | 1280 × 832 |
| Ubicacion (panel lime) | 50vw × 1000 |
| Galeria | 1280 × 900 |
| Preguntas | 1280 × 832 |
| Formulario | 1280 × 940 |

**Cheatsheet:**
```
74px  →  5.78%
88px  →  6.88%
92px  →  7.19%
110px →  8.59%
128px → 10.00%
170px → 13.28%
194px → 15.16%
244px → 29.33% (vertical 832)
311px → 24.30%
345px → 26.95%
390px → 30.47%
544px → 42.50%
640px → 50.00% ← centro
686px → 53.59%
702px → 84.38% (vertical 832)
917px → 71.64%
```

---

## 7. Validación

Después de cada conversión, abrir `pnpm dev` (ya con `--host` activo) y probar en:

- `375×667` — iPhone SE
- `390×844` — iPhone 14
- `768×1024` — iPad portrait
- `1024×768` — iPad landscape
- `1280×800` — laptop base
- `1440×900` — laptop común
- `1920×1080` — Full HD
- `2560×1440` — 2K
- `3840×2160` — 4K

DevTools "Toggle Device Toolbar" cubre los primeros; los grandes requieren ventana real o `window.resizeTo()`.

---

## 8. Lo que queda fuera de este doc

- **Quitar el `<meta viewport=1280>`** — es el objetivo final del refactor general (ver `REFACTOR-RESPONSIVE.md`). Una vez que TODO esté en `%`/`clamp()`/`vw`, se puede sacar y el mobile dejaría de escalar artificialmente.
- **Sustitución de imágenes responsive** (srcset multi-resolución) — fuera de scope responsive layout.
- **Performance** (lazy load, decoding) — ya está aplicado donde corresponde.

---

## 9. Resumen ejecutivo

> El proyecto VECTA 98 está **68% en medidas relativas**, con un 8% legítimamente en `px` (decoración + targets táctiles) y un 24% pendiente convertible. Las conversiones pendientes están concentradas en **3 archivos prioritarios** (`TipologiaAbierta.astro`, `TipologiaAbierta2.astro`, secciones del modal) y son cambios mecánicos: aplicar fórmula `% = px / canvas × 100`. Cero pendientes en Hero, ProyectoIntro, Galeria, Espacios, Tipologias polígonos, Ubicacion, Formulario, Preguntas decoración. El FAQ script de Preguntas queda en `px` por decisión consciente (mezclar `%` con `offsetHeight` rompe la animación).
