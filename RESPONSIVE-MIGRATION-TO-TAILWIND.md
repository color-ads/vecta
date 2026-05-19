# Migración del sistema responsive custom → breakpoints estándar de Tailwind

Este documento define cómo reemplazar las variantes custom del proyecto
(`mobile:`, `narrow:`, `tablet:` / `tablet-device:`, `pc-small:`, `desktop:`)
por las variantes responsive nativas de Tailwind (`sm:`, `md:`, `lg:`, `xl:`,
`2xl:`) en TODA la página web.

---

## 1. Estado actual

### 1.1. Variantes custom definidas en `src/styles/global.css`

| Variante       | Rango (px)   | Selector / `@media`                                       |
|----------------|--------------|-----------------------------------------------------------|
| `mobile:`      | ≤ 600        | `(max-width: 600px)` + `html[data-device][data-device="phone"]` |
| `narrow:`      | ≤ 768 (phone + tablet) | `(min-width: 601px) and (max-width: 768px)` + `data-device="phone"` + `data-device="tablet"` |
| `tablet:`      | 601 – 768    | `(min-width: 601px) and (max-width: 768px)` + `data-device="tablet"` |
| `tablet-device:` | 601 – 768  | alias de `tablet:`                                        |
| `pc-small:`    | 769 – 1024   | `(min-width: 769px) and (max-width: 1024px)` + `data-device="pc-small"` |
| `desktop:`     | ≥ 1025       | `(min-width: 1025px)` + `data-device="desktop"`           |

### 1.2. Tailwind v4 — breakpoints por defecto

Tailwind v4 (instalado vía `@tailwindcss/vite` en este proyecto, sin
`tailwind.config.*`) trae estos breakpoints mobile-first:

| Variante | `min-width` |
|----------|-------------|
| `sm:`    | 640px       |
| `md:`    | 768px       |
| `lg:`    | 1024px      |
| `xl:`    | 1280px      |
| `2xl:`   | 1536px      |

Tailwind también soporta `max-sm:`, `max-md:`, etc. (`max-width: BREAKPOINT - 1`)
y combinaciones tipo `md:max-lg:` (rango cerrado).

### 1.3. Volumen del cambio

- **262 ocurrencias** de variantes custom en `src/**/*.astro`.
- **14 archivos** afectados. Top por volumen:
  - `AboutCarousel.astro` (62)
  - `Formulario.astro` (60)
  - `Ubicacion.astro` (28)
  - `Preguntas.astro` (22)
  - `TipologiaAbierta2.astro` (20)
  - `Galeria.astro` (18)
  - `TipologiaAbierta.astro` (12)
  - `Hero.astro` (9)
  - `gracias.astro` (9)
  - `Espacios.astro` (8)
  - `Tipologias.astro` (5)
  - `ProyectoIntro.astro` (4)
  - `Header.astro` (4)
  - `Layout.astro` (1)

---

## 2. Mapping canónico

Cómo migrar cada variante custom. Las equivalencias **no son exactas al pixel**
porque los breakpoints difieren (ver §3 — gaps de 1–40px). Se elige la opción
más cercana en intención.

| Custom            | Rango original | Equivalente Tailwind                              | Notas |
|-------------------|----------------|---------------------------------------------------|-------|
| `mobile:X`        | ≤ 600          | `max-sm:X` (< 640)                                | Sin equivalente exacto. Ver §3.1. |
| `narrow:X`        | ≤ 768          | `max-md:X` (< 768)                                | `narrow` incluye phone + tablet → coincide con "todo lo que sea < md". |
| `tablet:X`        | 601 – 768      | `sm:max-md:X` (640 – 767)                         | Rango cerrado. |
| `tablet-device:X` | 601 – 768      | `sm:max-md:X`                                     | Igual que `tablet:`. |
| `pc-small:X`      | 769 – 1024     | `md:max-lg:X` (768 – 1023)                        | Rango cerrado. |
| `desktop:X`       | ≥ 1025         | `lg:X` (≥ 1024)                                   | Gap de 1px — irrelevante en la práctica. |

### Modificador `!` (important)

El patrón actual `mobile:!top-[240px]` se convierte en `max-sm:!top-[240px]`
(Tailwind v4 soporta el prefijo `!` después del modificador). Mismo orden:
`<variant>:!<utility>`.

### Combinaciones con `data-*`

Patrones como `mobile:data-[active=true]:opacity-100` se mantienen como
`max-sm:data-[active=true]:opacity-100`. No cambia la sintaxis interna.

---

## 3. Caveats importantes — leer antes de migrar

### 3.1. Los breakpoints no son idénticos al pixel

| Phone real | Custom (`mobile:`) | Tailwind (`max-sm:`) | ¿Cambia algo? |
|------------|--------------------|----------------------|----------------|
| ≤ 600px    | ✅ aplica          | ✅ aplica            | No             |
| 601–639px  | ❌ no aplica       | ✅ aplica            | **Sí** — antes mostraba layout "narrow", ahora muestra layout "mobile" |
| 640–767px  | ❌ no aplica       | ❌ no aplica         | No             |

El rango 601–639px (ej. iPhone landscape, algunos plegables) cambiará de
bucket. **No es un bug intrínseco**, pero requiere revisión visual de cualquier
dispositivo cuyo viewport caiga en esa franja antes de cerrar la migración.

Equivalencias **exactas al pixel** posibles con sintaxis arbitraria, si se
quisiera preservar 600/768/1024:

```
mobile:X      → max-[600px]:X
narrow:X      → max-[768px]:X
tablet:X      → min-[601px]:max-[768px]:X
pc-small:X    → min-[769px]:max-[1024px]:X
desktop:X     → min-[1025px]:X
```

Esto **es Tailwind** (arbitrary variants), pero **no usa los nombres `sm/md/lg/xl/2xl`**.
Si la intención del usuario es estrictamente `sm/md/lg/xl/2xl`, hay que aceptar
los gaps. Si lo que importa es preservar el comportamiento exacto, usar los
arbitrarios. **Recomendación:** usar `sm/md/lg/xl/2xl` y aceptar los gaps.

### 3.2. El sistema `data-device` deja de ser necesario para CSS

El meta viewport en `Layout.astro:15` ya es `width=device-width` (no `1280`),
así que las media queries de Tailwind van a leer el ancho real del dispositivo
sin trucos. **El motivo histórico para crear `data-device` (viewport fijo a 1280)
ya no existe** en este código.

Sin embargo, `data-device` se sigue usando para:

1. **JS** que ramifica en `data-device === 'phone'` (ver CLAUDE.md y los scripts
   en `Preguntas.astro`, `Tipologias.astro`, `AboutCarousel.astro`). Estos NO
   se ven afectados por esta migración — el atributo sigue vivo en `<html>`.
2. **Visibilidad del nav** (`html[data-device="phone"] .desktop-nav { display:none }`
   en `global.css:139-146`). Tampoco se toca.

Después de la migración, las variantes custom (`mobile:`, etc.) en CSS dejan
de tener uso, pero los selectores `[data-device="..."]` en `global.css` y los
checks de JS siguen igual.

### 3.3. Pérdida de la "isolation rule"

Hoy, una clase `narrow:` y una `mobile:` **no se solapan** (rangos disjuntos:
601–768 vs ≤600). En Tailwind, `max-md:` aplica a TODO < 768 — es decir,
incluye el rango `mobile:`. La regla del proyecto ("cada edit en una variante,
sin leak") deja de tener fronteras tan limpias.

Estrategia: cuando un elemento tenía estilos diferentes en `mobile:` vs `narrow:`,
escribir primero la regla más amplia (`max-md:`) y luego la más específica
(`max-sm:`). Tailwind las ordena correctamente porque `max-sm` está más abajo
en la escala de breakpoints. Verificar por sección durante la migración.

### 3.4. `tablet:` vs `narrow:` — disambiguación

`narrow:` dispara en phone (≤600) + tablet (601-768). `tablet:` dispara solo
en tablet (601-768). Después de migrar:

- Donde se usaba `narrow:` con la intención de "stacked layout para móvil y
  tablet juntos" → `max-md:`
- Donde se usaba `tablet:` con la intención de "solo tablet" → `sm:max-md:`

Hay 18 ocurrencias de `tablet:` y 60+ de `narrow:`. Revisar caso por caso, no
hacer un sed global ciego.

### 3.5. `desktop:hidden` y el orden mobile-first

`desktop:hidden` (≥1025) tenía la intención de "ocultar en PC". Tailwind es
mobile-first, así que `lg:hidden` (≥1024) hace exactamente eso. Lo mismo aplica
a todas las clases que en el sistema custom usaban `desktop:` como override
"para arriba": `lg:` es el reemplazo natural.

### 3.6. `pc-small:!` (important override)

El uso típico es `pc-small:!text-[clamp(16px,2.1vw,26px)]` para forzar un tamaño
en 769–1024 sobre una base que ya tenía otro valor. Se traduce a
`md:max-lg:!text-[clamp(16px,2.1vw,26px)]`. Conserva el `!`.

---

## 4. Plan de migración

### Fase 0 — Preparación (sin tocar componentes)

1. **Validar visualmente** el viewport actual: confirmar que la pantalla se ve
   bien en 360 (phone), 390 (phone), 768 (tablet portrait), 820 (iPad portrait),
   1024 (iPad landscape / small PC), 1280 (PC), 1440 (PC), 1920 (PC).
2. **Hacer una captura de cada sección en cada bucket** como referencia para
   comparar después.
3. **Crear branch dedicada**: `git checkout -b refactor/tailwind-responsive`.

### Fase 1 — Migración de utilidades (un archivo a la vez)

Orden recomendado (de más simple a más complejo):

1. `src/layouts/Layout.astro` (1 ocurrencia)
2. `src/components/Header.astro` (4)
3. `src/sections/ProyectoIntro.astro` (4)
4. `src/sections/Tipologias.astro` (5)
5. `src/sections/Espacios.astro` (8)
6. `src/pages/gracias.astro` (9)
7. `src/sections/Hero.astro` (9)
8. `src/components/TipologiaAbierta.astro` (12)
9. `src/sections/Galeria.astro` (18)
10. `src/components/TipologiaAbierta2.astro` (20)
11. `src/sections/Preguntas.astro` (22)
12. `src/sections/Ubicacion.astro` (28)
13. `src/sections/Formulario.astro` (60)
14. `src/sections/AboutCarousel.astro` (62)

Para cada archivo:

1. Aplicar el mapping de §2 con search-replace asistido (no `sed -i` ciego —
   ver §5).
2. Verificar visualmente en los 8 viewports de la fase 0.
3. Commit individual: `refactor(<archivo>): migrate custom variants to tailwind sm/md/lg/xl`.

### Fase 2 — Limpieza de `global.css`

Una vez que `grep -r "mobile:\|narrow:\|tablet:\|tablet-device:\|pc-small:\|desktop:" src` no devuelva nada:

1. Borrar los bloques `@custom-variant mobile`, `narrow`, `tablet`, `tablet-device`,
   `pc-small`, `desktop` (líneas 47–79 aprox de `global.css`).
2. **Conservar** todos los `html[data-device="..."]` (líneas 139–146, 165+) —
   son selectores de visibilidad y de tema del nav, no dependen de las variantes.
3. **Conservar** el script de `Layout.astro` que setea `data-device` — sigue
   siendo la fuente de verdad para JS.
4. Actualizar `CLAUDE.md`: reemplazar la sección "Responsive layout —
   `data-device` and the variant system" para reflejar que ahora se usa
   Tailwind estándar y que `data-device` queda solo para JS y para visibilidad
   del nav.

### Fase 3 — Verificación final

1. `pnpm astro check` — sin errores.
2. `pnpm build` — sin warnings nuevos.
3. Comparar capturas de la fase 0 contra el estado actual en los 8 viewports.
4. Probar `Formulario` (HubSpot fetch), `Tipologias` (modal + carousel), y
   `Preguntas` (FAQ JS) en phone real, no solo DevTools — son los flujos con
   más JS sensible al `data-device`.

---

## 5. Cómo hacer el reemplazo de manera segura

### 5.1. No usar `sed -i` global

Los rangos no son idénticos al pixel y `tablet:` vs `narrow:` requieren
desambiguación por uso. Una migración global con sed se va a equivocar en al
menos 10–15 casos.

### 5.2. Patrón recomendado: por variante, por archivo, en Edit

Para cada archivo, ejecutar 6 pasadas de `replace_all=false` (una por variante),
revisando cada ocurrencia:

```
mobile:        → max-sm:
narrow:        → max-md:
tablet:        → sm:max-md:
tablet-device: → sm:max-md:
pc-small:      → md:max-lg:
desktop:       → lg:
```

Para utilidades con `!`: el `!` queda pegado al utility (no a la variante) y
se preserva tal cual.

```
mobile:!top-[240px]  →  max-sm:!top-[240px]
pc-small:!text-...   →  md:max-lg:!text-...
```

### 5.3. Validación post-migración por archivo

```sh
# Después de migrar un archivo, no debe quedar ninguna variante vieja:
grep -nE "(mobile|narrow|tablet|tablet-device|pc-small|desktop):" src/sections/<file>.astro
```

---

## 6. Decisión pendiente del usuario

Antes de empezar la fase 1, confirmar:

1. **¿Aceptar el gap de breakpoints** (600 ↔ 640, 1024 ↔ 1025) usando los nombres
   `sm/md/lg/xl/2xl` tal como pide el ticket? **Recomendado.**
2. **¿Preservar exactitud al pixel** usando variantes arbitrarias como
   `max-[600px]:`, `min-[601px]:max-[768px]:`, etc.? Más fiel al comportamiento
   actual pero pierde los nombres estándar.
3. **¿Migración en una sola PR grande, o una PR por archivo?** Dado el volumen
   (262 cambios en 14 archivos), una PR por archivo es más revisable, pero
   genera 14 PRs. Una opción intermedia: una PR por sección de complejidad
   (ej. agrupar las tres `Tipologia*` juntas).

Mi recomendación: opción 1 (gap aceptado) + PRs agrupadas por sección.

---

## 7. Resumen ejecutivo

| Antes (262 usos)             | Después                         |
|------------------------------|---------------------------------|
| `mobile:` (≤600)             | `max-sm:` (<640)                |
| `narrow:` (≤768)             | `max-md:` (<768)                |
| `tablet:` / `tablet-device:` (601–768) | `sm:max-md:` (640–767) |
| `pc-small:` (769–1024)       | `md:max-lg:` (768–1023)         |
| `desktop:` (≥1025)           | `lg:` (≥1024)                   |

Después de la migración:
- `src/styles/global.css` pierde ~33 líneas (los `@custom-variant`).
- `data-device` sobrevive solo para JS y visibilidad del nav.
- Toda la web usa nombres Tailwind estándar.
- Hay que validar visualmente los rangos 601–639 (cambian de bucket).
