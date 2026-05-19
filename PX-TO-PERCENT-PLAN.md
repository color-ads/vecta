# Plan de Conversión PX → % — VECTA 98

**Objetivo:** Convertir dimensiones y posiciones absolutas en píxeles (heredadas literalmente del canvas Figma de 1280×N) a porcentajes relativos al contenedor, para lograr un layout verdaderamente fluido en cualquier resolución (1024px → 4K → ultra-wide).

**Documento hermano:** `REFACTOR-RESPONSIVE.md` (estrategia general y fases).
Este doc se enfoca **solo en la regla `px → %`** y entrega tablas de conversión listas para aplicar.

---

## 1. Principio: cuándo `%` gana y cuándo `px` se queda

| Caso | Usar | Por qué |
|---|---|---|
| **Posición horizontal** dentro de canvas (`left`, `right`) | **`%`** | El canvas escala con la pantalla; la fracción se mantiene. |
| **Ancho de bloques de contenido grandes** (`w-[639px]`, `w-[917px]`) | **`%`** | Mismo motivo: bloques grandes deben escalar. |
| **Posición vertical** dentro de canvas de altura fija | **`%`** del alto del canvas | Permite fluidez sin perder anclas verticales. |
| **Líneas decorativas 1–2px** (borders, dividers, scanlines) | **`px`** | El grosor de una línea NO escala — siempre debe ser nítido. |
| **Gaps pequeños** (`gap-[12px]`, `gap-[16px]`) | **`px`** | Espaciado UI consistente — no varía con resolución. |
| **Padding interior de inputs/botones** (`p-[14px]`) | **`px`** | Affecta legibilidad y target táctil. |
| **Íconos pequeños** (dots, checkboxes, chevrons < 32px) | **`px`** | UI controls deben ser estables. |
| **Tipografía** | **`clamp(min, vw, max)`** | Ya documentado — escala con límites. |
| **Aspect-ratio shapes** (cuadrados, círculos) | **`%` + `aspect-square`** | Ya hecho en Espacios.astro tras el último cambio. |

**Regla mental rápida:** *Si lo midieras con regla en mano sobre el papel impreso, ¿debería seguir igual en pantallas grandes y chicas? → `px`. ¿Debería crecer proporcionalmente? → `%`.*

---

## 2. Canvas de referencia por sección

Cada sección tiene su propio canvas Figma. Para convertir `left-[Xpx]` a porcentaje:
**`% = (X / canvas_width) * 100`**

| Sección | Ancho canvas | Alto canvas | Archivo |
|---|---|---|---|
| Header (global) | 1280 | 80 | `Header.astro` |
| Hero | 1280 | ≈100vh | `Hero.astro` |
| ProyectoIntro | 1280 | 832 | `ProyectoIntro.astro` |
| AboutCarousel | 1280 | 832 | `AboutCarousel.astro` |
| Espacios | 1280 | 832 | `Espacios.astro` ✅ figuras ya en % |
| Tipologias | 1280 | 2085 | `Tipologias.astro` |
| Ubicacion | 1280 | 1000 | `Ubicacion.astro` |
| Galeria | 1280 | 900 | `Galeria.astro` |
| Preguntas | 1280 | dinámico | `Preguntas.astro` |
| Formulario | 1280 | 940 | `Formulario.astro` |

---

## 3. Tabla de conversión por componente

### 3.1 `Header.astro`

Casi todo ya está en `clamp()`. Solo quedan ítems del nav con `left-[Xpx]` calculados desde JS.

| Actual | Propuesto | Notas |
|---|---|---|
| `left: ${navItem.x}px` (inline, vía JS) | `left: ${(navItem.x/1280)*100}%` | El array `NAV_ITEMS` ya tiene coords Figma. Multiplicar al inyectar. |
| `gap-[clamp(11px,1.2vw,16px)]` | mantener | Gap pequeño ya es responsivo. |
| `w-[36px] h-[36px]` (carets) | mantener | Ícono pequeño. |

---

### 3.2 `Hero.astro`

Mezcla ya razonable. Foco en líneas decorativas y bloque de logo.

| Actual | Propuesto | Notas |
|---|---|---|
| `left-[74px] w-[639px]` (logo) | `left-[5.78%] w-[49.92%]` | 74/1280 = 5.78%, 639/1280 = 49.92%. |
| `top-[245px]` | `top-[40.83%]` (si canvas = 600) | Calcular según altura real. |
| `h-[1px]` (scanlines) | mantener | Decorativo — siempre 1px. |
| `border-[1px]` | mantener | Mismo motivo. |

---

### 3.3 `ProyectoIntro.astro`

Ya usa `clamp()` extensivamente. Las pocas posiciones absolutas restantes son convertibles.

| Actual | Propuesto | Notas |
|---|---|---|
| `right-[clamp(40px,5vw,80px)]` | mantener | Ya responsivo. |
| `top-[245px]` | `top-[29.45%]` (canvas 832) | Posición vertical sobre canvas fijo. |
| `w-[clamp(260px,30vw,300px)]` | mantener | Ya hidratado. |

---

### 3.4 `AboutCarousel.astro`

Tres slides con figuras geométricas decorativas. Las figuras ya son `%`, pero las cards tienen anchos fijos.

| Actual | Propuesto | Notas |
|---|---|---|
| `w-[271px]` (card amenidad) | `w-[21.17%]` | 271/1280. |
| `gap-[14px]` (cards) | mantener | Gap pequeño. |
| `left-[170px] top-[244px]` (manifesto) | `left-[13.28%] top-[29.33%]` | Canvas 1280×832. |
| `w-[917px]` (texto manifesto) | `w-[71.64%]` | 917/1280. |
| `border-[1px]` rombo | mantener | Decorativo. |
| `w-[12px] h-[12px]` (dots paginación) | mantener | UI control. |

---

### 3.5 `Espacios.astro`  ✅

Las figuras concéntricas ya están en `%` con `aspect-square` tras el último cambio. Texto centrado con `left-1/2`. **Listo, no requiere más cambios.**

---

### 3.6 `Tipologias.astro`

Canvas alto (2085px). Polígonos callout son los críticos.

| Actual | Propuesto | Notas |
|---|---|---|
| `clip-path: polygon(355px 432px, ...)` | `clip-path: polygon(27.73% 20.72%, ...)` | Dividir cada X por 1280 y cada Y por 2085. |
| `left-[88px] top-[416px]` (tabla) | `left-[6.88%] top-[19.95%]` | Fila/columna tabla tipologías. |
| `w-[12px] h-[12px]` (dots callouts) | mantener | UI control. |
| `border-l-[1px]` (separadores tabla) | mantener | Decorativo. |

---

### 3.7 `Ubicacion.astro`

Ya usa `calc(50vw - ...)` para el split central — muy bien. Quedan posiciones fijas en el panel lime.

| Actual | Propuesto | Notas |
|---|---|---|
| `left-[calc(50%-135.5px)]` | mantener | Ya responsive (offset chico al 50%). |
| `top-[153px]` (heading panel) | `top-[15.3%]` (canvas 1000) | |
| `padding-[clamp(20px,3vw,58px)]` | mantener | Ya responsivo. |
| `w-[1px]` divisor | mantener | Decorativo. |

---

### 3.8 `Galeria.astro`

Ya es muy responsive — usa `vw`, `vh`, `calc()`. Solo bordes y rings quedan en px (deben quedarse).

| Actual | Propuesto | Notas |
|---|---|---|
| `h-[43.78%]` (split horizontal) | mantener | Ya en %. |
| `left-[calc(50vw-9px)]` | mantener | Centro fluido. |
| `ring-[2px]` hover | mantener | UI control. |
| `gap-[10px]` cuadrícula | mantener | Gap pequeño. |

---

### 3.9 `Preguntas.astro`

Tops de filas FAQ se calculan en JS dinámicamente. El array `CLOSED_TOPS` y `OPEN_TOPS` tienen valores en px.

| Actual | Propuesto | Notas |
|---|---|---|
| `style="top: ${CLOSED_TOPS[i]}px"` (inline JS) | `style="top: ${(CLOSED_TOPS[i]/CANVAS_H)*100}%"` | Requiere conocer `CANVAS_H` del FAQ y refactorizar el script. |
| `h-[73px]` fila colapsada | `h-[8.78%]` (si canvas 832) | O mantener si es UI control. |
| `border-b-[1px]` | mantener | Decorativo. |
| `w-[13px] h-[13px]` (chevron) | mantener | UI control. |

⚠️ **Cuidado:** la animación de apertura/cierre del FAQ depende de transiciones sobre `top`. Si pasamos a %, la transición sigue funcionando, pero hay que probar que el cálculo dinámico del alto abierto sea consistente.

---

### 3.10 `Formulario.astro`

PC en split izquierdo (form) + derecho (comentario). Mucho ya en `clamp()` para tipografía. Posiciones absolutas convertibles.

| Actual | Propuesto | Notas |
|---|---|---|
| `left-[168px] top-[148px]` (título) | `left-[13.13%] top-[15.74%]` | Canvas 1280×940. |
| `left-[706px] top-[260px]` (label comentario) | `left-[55.16%] top-[27.66%]` | |
| `left-[706px] top-[310px] w-[392px] h-[335px]` (textarea) | `left-[55.16%] top-[32.98%] w-[30.63%] h-[35.64%]` | |
| `left-[175px] top-[280px] w-[451px]` (form) | `left-[13.67%] top-[29.79%] w-[35.23%]` | |
| `left-[706px] top-[660px] w-[395px]` (consent) | `left-[55.16%] top-[70.21%] w-[30.86%]` | |
| `left-[875px] top-[760px] w-[214px] h-[47px]` (botón) | `left-[68.36%] top-[80.85%] w-[16.72%] h-[5%]` | Botón en %. |
| `h-[47px]` inputs PC | mantener o `clamp(40px,4vw,52px)` | Altura form control. |
| `p-[14px]` interior input | mantener | Legibilidad. |
| `gap-[12px]` checkbox+texto | mantener | UI gap. |
| `w-[22px] h-[23px]` radio | mantener | UI control. |

---

## 4. Lo que NUNCA convertir a `%`

1. **Líneas decorativas (`1px`, `2px`):** un borde al 0.1% se ve borroso o desaparece.
2. **Iconos pequeños (< 32px):** chevrons, dots, checkmarks, hamburger lines.
3. **Espaciado UI (`gap-2`, `gap-3`, paddings de form fields):** consistencia visual.
4. **Radios de border (`rounded-[10px]`):** estética uniforme.
5. **Tamaños de target táctil mínimos:** Apple recomienda 44px mínimo — fijar.
6. **Sombras (`shadow-[0_4px_12px]`):** no escalar.

---

## 5. Pasos de implementación recomendados

**Fase 1 — Quick wins (1–2h):**
- ✅ Espacios.astro (hecho).
- AboutCarousel.astro: cards manifesto/amenidades.
- Formulario.astro: posiciones absolutas del split PC.

**Fase 2 — Riesgo medio (3–5h):**
- Tipologias.astro: polígonos callout (`clip-path`).
- Preguntas.astro: refactor del script para tops dinámicos en %.
- Header.astro: nav-items inline-style en JS.

**Fase 3 — Validación (1–2h por breakpoint):**
- Probar en 1024 / 1280 / 1440 / 1920 / 2560 / 3840 px.
- Probar mobile portrait/landscape, tablet portrait/landscape.
- Verificar que el `<meta viewport>` siga siendo necesario o pueda eliminarse (objetivo final del refactor general).

---

## 6. Fórmulas rápidas (cheatsheet)

```
Ancho canvas Figma: 1280px (todas las secciones)
Alto canvas Figma: variable (832, 940, 1000, 2085...)

% horizontal = (px / 1280) * 100
% vertical   = (px / alto_canvas) * 100

Ejemplos comunes:
  64px  →  5.00%
  128px → 10.00%
  170px → 13.28%
  256px → 20.00%
  320px → 25.00%
  427px → 33.33%
  640px → 50.00%   ← centro horizontal
  854px → 66.67%
  960px → 75.00%
  1024px → 80.00%
```

---

## 7. Estado actual del proyecto

✅ Tokens, fuentes y `clamp()` ya están bien planteados.
✅ `Espacios.astro` — figuras ya en `%`.
✅ Tipografía base — `clamp()` aplicado en casi todas las secciones.
⚠️ Posiciones absolutas — **aún en px en la mayoría de secciones** (este doc lo aborda).
⚠️ El hack `<meta viewport=1280>` sigue activo y es lo que permite que los px "funcionen" en mobile escalando todo. **Objetivo final del refactor general** (ver `REFACTOR-RESPONSIVE.md`) es poder quitarlo cuando todo esté en `%`/`clamp()`.
