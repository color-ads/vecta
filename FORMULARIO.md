# Formulario de Contacto — Documentación de Integración

> Sección `#formulario` de **VECTA 98**  
> Archivo fuente: `src/sections/Formulario.astro`  
> Proxy API: `src/pages/api/lead.ts`  
> Página de confirmación: `src/pages/gracias.astro`

---

## Tabla de contenidos

1. [Visión general](#1-visión-general)
2. [Campos del formulario](#2-campos-del-formulario)
3. [Arquitectura del layout](#3-arquitectura-del-layout)
4. [Sistema responsivo detallado](#4-sistema-responsivo-detallado)
5. [Estilos CSS requeridos](#5-estilos-css-requeridos)
6. [Tokens de diseño](#6-tokens-de-diseño)
7. [Flujo de envío](#7-flujo-de-envío)
8. [API proxy `/api/lead`](#8-api-proxy-apilead)
9. [Integración con HubSpot](#9-integración-con-hubspot)
10. [Página de confirmación `/gracias`](#10-página-de-confirmación-gracias)
11. [Guía de integración a otro proyecto](#11-guía-de-integración-a-otro-proyecto)
12. [Checklist de integración](#12-checklist-de-integración)

---

## 1. Visión general

El formulario es una sección de pantalla completa (`min-h-screen`) sobre fondo lima (`#eafc9d`). En desktop el layout es de **dos columnas**:

- **Columna izquierda** (≈ 40% del canvas): título, subtítulo y campos del formulario principal.
- **Columna derecha** (≈ 30% del canvas): etiqueta, textarea de comentario libre y checkbox de consentimiento.

En **tablet y móvil (≤ 768 px)** las dos columnas se apilan verticalmente en el orden: título → subtítulo → formulario → comentario → consentimiento → botón.

El formulario usa el atributo `id="contactForm"` como ancla de referencia. El `<textarea>` y el `<input type="checkbox">` de consentimiento viven **fuera** del `<form>` en el DOM para mantener el layout de dos columnas, pero se asocian al formulario mediante `form="contactForm"`, por lo que se incluyen al serializar `new FormData(form)`.

Al enviarse, el formulario hace un `fetch` POST a `/api/lead` (proxy serverless que reenvía server-to-server a HubSpot). Si la respuesta es `200 OK`, redirige a `/gracias`.

---

## 2. Campos del formulario

### Campos del `<form id="contactForm">`

| Campo HTML | `name` | Tipo | Validación | Mapeado a HubSpot |
|---|---|---|---|---|
| Nombre | `nombre` | `text` | required, minlength=2, maxlength=80 | `firstname` |
| Apellido | `apellido` | `text` | required, minlength=2, maxlength=80 | `lastname` |
| Celular | `celular` | `tel` | required, pattern `[0-9+\s\-]{7,20}`, inputmode=numeric | `celular` |
| Correo | `correo` | `email` | required, maxlength=120 | `email` |
| Propósito | `proposito` | `radio` (inversion / vivienda) | required | `proposito` |
| Contacto telefónico | `contactoTelefonico` | `radio` (si / no) | required | `contacto_telefonico` |
| Origen | `origenContacto` | `select` | required | `origen_contacto` |

### Campos fuera del `<form>` (asociados con `form="contactForm"`)

| Campo HTML | `name` | Tipo | Validación | Mapeado a HubSpot |
|---|---|---|---|---|
| Comentario | `comentario` | `textarea` | maxlength=1000 (opcional) | `message` |
| Consentimiento | `consent` | `checkbox` | required | No se envía como campo; activa `legalConsentOptions` en el payload |

### Opciones del `<select>` Origen

| `value` | Texto visible |
|---|---|
| `redes-sociales` | Redes Sociales |
| `referido` | Referido |
| `portales-vivienda` | Portales de vivienda |
| `correos-mensajes` | Correos o mensajes de texto |
| `donde-esta-bueno-invertir` | Grupo (Donde está bueno invertir) |

---

## 3. Arquitectura del layout

```
<section #formulario>
  └── <div> canvas max-w-[1280px]
        ├── <h2>  "Quiero saber más"
        ├── <p>   subtítulo descriptivo
        │
        ├── <p>   "Deja tu comentario aquí:"         ← columna derecha
        ├── <textarea form="contactForm" name="comentario"> ← columna derecha
        │
        ├── <form id="contactForm">                   ← columna izquierda
        │     ├── label + input  nombre
        │     ├── label + input  apellido
        │     ├── label + input  celular
        │     ├── label + input  correo
        │     ├── <p> + radio    proposito (inversión / vivienda)
        │     ├── <p> + radio    contactoTelefonico (sí / no)
        │     └── label + select origenContacto
        │
        ├── <label>  consentimiento (form="contactForm") ← columna derecha
        │     └── <input type="checkbox" form="contactForm" name="consent">
        │
        └── <button form="contactForm">  ENVIAR
              ├── <span data-submit-label>   ENVIAR
              └── <span data-submit-spinner> (spinner animado)

<p data-form-status>  (mensajes de error / éxito)
```

### Por qué `<textarea>` y `<input[consent]>` están fuera del `<form>`

En desktop, el textarea y el checkbox viven visualmente en la columna derecha, separados del `<form>` que ocupa la columna izquierda. Extraerlos del `<form>` evita romper el flujo de posicionamiento absoluto del canvas. El atributo `form="contactForm"` los vincula al formulario para que participen en `FormData` y en la validación nativa del navegador.

---

## 4. Sistema responsivo detallado

### Breakpoints del proyecto

El proyecto usa Tailwind v4 con el breakpoint `md` desplazado a `769px` (override en `global.css`):

```css
/* global.css */
@theme {
  --breakpoint-md: 769px;
}
```

| Variante Tailwind | Rango de viewport | Dispositivo objetivo |
|---|---|---|
| `max-sm:` | ≤ 639 px | Teléfono |
| `sm:max-md:` | 640–768 px | Tablet |
| `max-md:` | ≤ 768 px | Teléfono + Tablet (compartido) |
| `md:max-lg:` | 769–1023 px | PC pequeño |
| `lg:` | ≥ 1024 px | Desktop |
| `xl:` | ≥ 1280 px | Desktop ancho |

> **Regla base (sin prefijo)** = desktop 1280 px (canvas Figma). Es el punto de partida; los overrides de variante solo aplican en su rango y no afuera.

---

### Tabla de responsividad: `<section #formulario>`

| Propiedad | Desktop (base) | Tablet (640–768) `sm:max-md:` | Móvil (≤ 639) `max-sm:` |
|---|---|---|---|
| Display | `flex items-center justify-center` | `block` (`max-md:`) | `block` (`max-md:`) |
| Altura mínima | `min-h-screen` | `min-h-[1400px]` (`sm:max-md:`) | `min-h-[1100px]` (`max-sm:`) |
| Overflow | `overflow-hidden` | — | — |
| Fondo | `bg-vecta-lime` | — (hereda) | — (hereda) |

### Tabla de responsividad: canvas interno (`.max-w-[1280px]`)

| Propiedad | Desktop | Tablet `sm:max-md:` | Móvil `max-sm:` |
|---|---|---|---|
| Alto fijo | `h-[940px]` | `h-[1400px]` (`sm:max-md:`) | `h-[1100px]` (`max-sm:`) |
| Ancho | `w-full max-w-[1280px]` | — (hereda) | — (hereda) |

---

### Tabla de responsividad: título `<h2>`

| Propiedad | Desktop | `max-md:` (≤ 768) | `sm:max-md:` (tablet) | `max-sm:` (móvil) |
|---|---|---|---|---|
| Posición | `absolute left-[13.13%] top-[15.74%]` | `left-0 right-0 top-[3.90%]` | `top-[4.29%]` | — |
| Alineación | — | `text-center w-full` | — | — |
| Tamaño | `clamp(24px, 3.5vw, 44px)` | `clamp(36px, 6.5vw, 80px)` | `36px` fijo | `28px` fijo |

### Tabla de responsividad: subtítulo `<p>`

| Propiedad | Desktop | `max-md:` | `sm:max-md:` | `max-sm:` |
|---|---|---|---|---|
| Posición | `left-[13.13%] top-[20.74%]` | `left-0 right-0 top-[8.29%] text-center` | `top-[9.29%]` | — |
| Tamaño | `clamp(14px, 1.6vw, 20px)` | `clamp(18px, 2.5vw, 32px)` | `18px` fijo | `14px` fijo |

---

### Tabla de responsividad: `<form id="contactForm">`

| Propiedad | Desktop | `max-md:` | `sm:max-md:` | `max-sm:` |
|---|---|---|---|---|
| Posición | `absolute left-[13.67%] top-[29.79%]` | `left-1/2 top-[14.15%] -translate-x-1/2` | `top-[15%]` | — |
| Ancho | `w-[35.23%]` | `w-[78.13%]` | `w-[50%]` | `w-[calc(100vw-48px)]` |

### Tabla de responsividad: inputs de texto (`nombre`, `apellido`, `celular`, `correo`)

| Propiedad | Desktop | `max-md:` | `sm:max-md:` | `max-sm:` |
|---|---|---|---|---|
| Alto | `h-[47px]` | `h-[80px]` | `h-[52px]` | `h-[46px]` |
| Texto | heredado del form | `clamp(18px, 2.5vw, 32px)` | `16px` | `15px` |
| Margen inferior | `mb-[15px]` | `mb-[24px]` | `mb-[16px]` | `mb-[12px]` |
| Border radius | `rounded-[10px]` | — | — | — |

### Tabla de responsividad: `<select>` origen

| Propiedad | Desktop | `max-md:` | `sm:max-md:` | `max-sm:` |
|---|---|---|---|---|
| Alto | `h-[47px]` | `h-[80px]` | `h-[52px]` | `h-[46px]` |
| Texto | `text-[14px]` | `clamp(16px, 1.9vw, 22px)` | `16px` | `15px` |
| Margen inferior | `mb-[15px]` | `mb-[24px]` | `mb-[16px]` | `mb-[12px]` |

El `<select>` tiene un chevron SVG inyectado via `style="background-image: url(data:image/svg+xml...)"` porque `appearance-none` elimina la flecha nativa del navegador.

### Tabla de responsividad: radios (`proposito`, `contactoTelefonico`)

| Propiedad | Desktop | `max-md:` | `sm:max-md:` | `max-sm:` |
|---|---|---|---|---|
| Tamaño caja radio | `22×23px` | `44×44px` | `26×26px` | `20×20px` |
| Gap entre ítems | `gap-[12px]` | `gap-[18px]` | `gap-[14px]` | `gap-[10px]` |
| Separación entre opciones | `ml-[44px]` | — | — | `ml-[16px]` |
| Margen inferior grupo | `mb-[14px]` | `mb-[22px]` | `mb-[16px]` | `mb-[12px]` |

Los radios usan `appearance-none` + `checked:bg-vecta-dark` para un checkbox cuadrado personalizado (Tailwind). No hay imagen ni SVG externo.

---

### Tabla de responsividad: etiqueta de comentario `<p>`

| Propiedad | Desktop | `max-md:` | `sm:max-md:` | `max-sm:` |
|---|---|---|---|---|
| Posición | `absolute left-[55.16%] top-[27.66%]` | `left-1/2 top-[67.32%] -translate-x-1/2 whitespace-nowrap` | `top-[64.29%] text-[22px]` | `left-[24px] top-[62.91%] translate-x-0 whitespace-normal font-semibold` |
| Tamaño | `clamp(15px, 1.9vw, 24px)` | `clamp(24px, 3.5vw, 44px)` | `22px` | `14px` |

### Tabla de responsividad: `<textarea>` comentario

| Propiedad | Desktop | `max-md:` | `sm:max-md:` | `max-sm:` |
|---|---|---|---|---|
| Posición | `absolute left-[55.16%] top-[32.98%]` | `left-1/2 top-[70.73%] -translate-x-1/2` | `top-[67.86%]` | `left-[24px] top-[65.94%] translate-x-0` |
| Ancho | `w-[30.63%]` | `w-[78.13%]` | `w-[50%]` | `w-[calc(100vw-48px)]` |
| Alto | `h-[35.64%]` | `h-[13.66%]` | `h-[12.86%]` | `h-[13.64%]` |
| Texto | `clamp(13px, 1.4vw, 18px)` | `clamp(16px, 2.2vw, 28px)` | `16px` | `2.8vw` |

---

### Tabla de responsividad: consentimiento `<label>`

| Propiedad | Desktop | `max-md:` | `sm:max-md:` | `max-sm:` |
|---|---|---|---|---|
| Posición | `absolute left-[55.16%] top-[70.21%]` | `left-1/2 top-[85.85%] -translate-x-1/2` | `top-[84.29%]` | `top-[81.85%]` |
| Ancho | `w-[30.86%]` | `w-[78.13%]` | `w-[50%]` | `w-[calc(100vw-48px)]` |
| Gap interno | `gap-[12px]` | `gap-[18px]` | `gap-[14px]` | `gap-[10px]` |

### Tabla de responsividad: checkbox de consentimiento

| Propiedad | Desktop | `max-md:` | `sm:max-md:` | `max-sm:` |
|---|---|---|---|---|
| Tamaño | `18×18px` | `44×44px` | `22×22px` | `18×18px` |
| Margin-top | `mt-[3px]` | `mt-[4px]` | `mt-[3px]` | `mt-[2px]` |

---

### Tabla de responsividad: botón ENVIAR `<button>`

| Propiedad | Desktop | `max-md:` |
|---|---|---|
| Posición | `absolute left-[68.36%] top-[80.85%]` | `left-1/2 top-[90%] -translate-x-1/2` |
| Ancho | `w-[16.72%]` | `w-[min(70%,360px)]` |
| Alto | `h-[47px]` | `h-[56px]` |
| Texto | `clamp(16px, 2.2vw, 28px)` | `clamp(16px, 4vw, 22px)` |
| Spinner tamaño | `18×18px` | `22×22px` |

### Tabla de responsividad: `<p data-form-status>`

| Propiedad | Desktop | `max-md:` | `max-sm:` |
|---|---|---|---|
| Posición | `absolute left-[56.72%] top-[87%]` | `left-1/2 top-[96%] -translate-x-1/2` | — |
| Ancho | `w-[40%]` | `w-[78.13%]` | `w-[calc(100vw-48px)]` |
| Texto | `clamp(13px, 1.4vw, 16px)` | `clamp(14px, 2vw, 18px)` | — |

> **Nota de overflow**: el `<p data-form-status>` en móvil aparece debajo del botón en `top: 96%`, por eso el botón sube de `93%` (PC) a `90%` en `max-md:`. Sin este ajuste, el mensaje de estado queda cortado por el `overflow-hidden` de la sección.

---

## 5. Estilos CSS requeridos

Los siguientes estilos viven en `src/styles/global.css` y **deben copiarse** junto al componente al integrarlo en otro proyecto.

### Borde rojo en campo inválido

```css
.form-input-validate:user-invalid {
  border-color: #b91c1c;
}
```

La pseudo-clase `:user-invalid` solo activa el borde rojo **después** de que el usuario interactúa con el campo (focus + blur o intento de submit). Los campos vacíos al cargar la página no muestran rojo. Esta pseudo-clase no puede expresarse como una clase Tailwind.

Aplica a: los cuatro `<input>` de texto y al `<select>`. Los radios y el checkbox no llevan esta clase porque su indicación visual es el `checked:bg-vecta-dark`.

---

## 6. Tokens de diseño

Estos tokens deben existir en el `@theme` de Tailwind v4 (o adaptarse al sistema de diseño del proyecto destino):

```css
@theme {
  --color-vecta-lime:  #eafc9d;   /* fondo de la sección */
  --color-vecta-dark:  #22291d;   /* texto, bordes, fondo botón, checked */
  --font-display: "Albert Sans", system-ui, sans-serif;
}
```

**Colores en hex directos** (útiles si se migra fuera de Tailwind):

| Token | Hex |
|---|---|
| `vecta-lime` | `#eafc9d` |
| `vecta-dark` | `#22291d` |

> **Nota de compatibilidad**: el proyecto evita el modificador `/X` de alpha de Tailwind v4 (e.g. `bg-vecta-dark/40`) en elementos que pueden renderizarse en Chrome < 111, porque genera `color-mix(in oklab, ...)`. En su lugar se usa hex de 8 dígitos (`#22291d66`). El `focus:ring-2 focus:ring-vecta-dark/40` de los inputs **sí usa** esta sintaxis; si necesitas soporte en Chrome < 111, reemplázalo por `focus:ring-[#22291d66]`.

---

## 7. Flujo de envío

```
Usuario → click ENVIAR
    │
    ▼
1. e.preventDefault()
2. firstErrorMessage(form)
   ├── error → setStatus(mensaje, 'error')  ← detiene aquí
   └── ok    → continúa
    │
    ▼
3. setStatus('Enviando…', '')
   setLoading(true)        ← oculta label, muestra spinner, deshabilita botón
    │
    ▼
4. fetch POST /api/lead  { ...formData, pageUri, pageName }
    │
    ├── res.ok = false → setStatus('No pudimos enviar…', 'error')
    │                    setLoading(false)
    │
    └── res.ok = true  → setStatus('¡Gracias! Recibimos tu información.', 'success')
                         form.reset()
                         window.location.href = '/gracias'
                         (spinner sigue visible hasta que navega)
```

### Validación del lado cliente

La función `firstErrorMessage` itera `form.elements`, llama a `el.checkValidity()` en cada control con `willValidate = true`, y retorna el primer `el.validationMessage` encontrado (mensaje nativo del navegador, ya localizado). Hace `el.focus()` en el primer campo inválido.

### Estados del botón

| Estado | `disabled` | Spinner | Label |
|---|---|---|---|
| Idle | `false` | oculto | visible |
| Cargando | `true` | visible | oculto |
| Error | `false` | oculto | visible |
| Éxito | `true` (hasta redirect) | visible | oculto |

---

## 8. API proxy `/api/lead`

Ruta serverless Astro en `src/pages/api/lead.ts`. Requiere `prerender = false` y un adaptador de servidor (el proyecto usa Vercel).

### Por qué existe el proxy

El formulario envía a `/api/lead` (mismo dominio) en lugar de directamente a `api.hsforms.com`. Esto evita que bloqueadores de anuncios y pi-holes resuelvan el dominio de HubSpot con NXDOMAIN en el navegador del usuario.

### Payload que recibe el proxy

```json
{
  "nombre":            "string",
  "apellido":          "string",
  "celular":           "string",
  "correo":            "string (required)",
  "comentario":        "string (optional)",
  "proposito":         "inversion | vivienda",
  "contactoTelefonico": "si | no",
  "origenContacto":    "redes-sociales | referido | portales-vivienda | correos-mensajes | donde-esta-bueno-invertir",
  "pageUri":           "string",
  "pageName":          "string"
}
```

### Validación en el proxy

- Parsea el cuerpo como JSON; si falla → `400 invalid_json`.
- Verifica que exista `correo`; si falta → `400 missing_email`.
- Campos vacíos después de `trim()` se descartan (no se envían a HubSpot).

### Mapeo de campos a HubSpot

```
nombre            → firstname
apellido          → lastname
celular           → celular
correo            → email
comentario        → message
proposito         → proposito
contactoTelefonico → contacto_telefonico
origenContacto    → origen_contacto
```

> El campo `celular` en HubSpot usa ese nombre exacto (no `phone`) porque fue auto-generado desde el label en español al crear el form. Confirmado por pruebas directas contra el form ID `f9390f8d`.

### Fallback DNS

Si el DNS del sistema no puede resolver `api.hsforms.com` (e.g. pi-hole en desarrollo), el proxy reintenta con un resolver manual hacia `1.1.1.1` y `8.8.8.8`. Este fallback es transparente; en producción (Vercel) nunca se activa.

### Códigos de respuesta del proxy

| Código | Significado |
|---|---|
| `200` | Enviado a HubSpot con éxito |
| `400` | JSON inválido o falta `correo` |
| `502` | HubSpot rechazó el submit o error de red |

---

## 9. Integración con HubSpot

### Credenciales (hardcodeadas en `lead.ts`)

```ts
const HUBSPOT_PORTAL_ID = '44459766';
const HUBSPOT_FORM_ID   = 'f9390f8d-a76b-4b5f-9de1-544a208f4358';
```

### Estructura del payload hacia HubSpot

```json
{
  "submittedAt": 1716000000000,
  "fields": [
    { "objectTypeId": "0-1", "name": "firstname", "value": "Juan" },
    { "objectTypeId": "0-1", "name": "email",     "value": "juan@mail.com" }
  ],
  "context": {
    "pageUri":  "https://vecta98.com/",
    "pageName": "VECTA 98"
  },
  "legalConsentOptions": {
    "consent": {
      "consentToProcess": true,
      "text": "Autorizo a recibir información...",
      "communications": [
        { "value": true, "subscriptionTypeId": 999, "text": "..." }
      ]
    }
  }
}
```

El `consent` del checkbox solo activa `legalConsentOptions`; no se envía como un campo de propiedad de contacto.

### Para usar en un formulario de HubSpot distinto

1. Reemplazar `HUBSPOT_PORTAL_ID` y `HUBSPOT_FORM_ID` en `lead.ts`.
2. Verificar que los `name` de los campos HubSpot coincidan con `FIELD_MAP`. En HubSpot los nombres de propiedades personalizadas se ven en **Configuración → Propiedades → Nombre interno**.
3. Si el proyecto nuevo tiene campos distintos, actualizar `FIELD_MAP` con los pares `{ nombreLocal: 'nombre_interno_hubspot' }`.

---

## 10. Página de confirmación `/gracias`

Ruta Astro en `src/pages/gracias.astro`. Se renderiza después del redirect `window.location.href = '/gracias'`.

### Contenido

- Fondo `vecta-night` (`#151515`), texto blanco.
- Halo lime difuminado detrás del logo.
- Logo VECTA 98 centrado.
- Titular `¡Gracias!` en `vecta-lime`.
- Línea divisora lime.
- Subtítulo "Recibimos tu información correctamente."
- Botón "VOLVER AL INICIO" → `href="/"`.

### Breakpoints de `/gracias`

| Elemento | Desktop | `max-md:` (≤ 768) |
|---|---|---|
| Canvas alto | `h-[832px]` | `h-[1400px]` |
| Sección min-height | `min-h-screen` | `min-h-[1400px]` |
| Logo ancho | `w-[32.81%]` | `w-[50%]` |
| Titular tamaño | `clamp(26px, 4.2vw, 52px)` | `clamp(44px, 7.5vw, 96px)` |
| Botón volver ancho | `w-[20.31%]` | `w-[min(31.25%, calc(100vw-40px))]` |

---

## 11. Guía de integración a otro proyecto

### Requisitos del proyecto destino

| Requisito | Detalles |
|---|---|
| Framework | Astro con SSR habilitado (adaptador Vercel, Node, Cloudflare, etc.) |
| CSS | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Fuente | Albert Sans desde Google Fonts (o cualquier sans-serif substituida en `--font-display`) |
| Node | ≥ 22.12 |

### Paso 1 — Copiar archivos

```
src/sections/Formulario.astro
src/pages/api/lead.ts
src/pages/gracias.astro          ← opcional; puedes crear tu propia página de confirmación
```

### Paso 2 — Agregar tokens al `@theme` de Tailwind

En tu `global.css` (o equivalente):

```css
@theme {
  --color-vecta-lime: #eafc9d;
  --color-vecta-dark: #22291d;
  --font-display: "Albert Sans", system-ui, sans-serif;
  --breakpoint-md: 769px;        /* ajustar si tu proyecto usa otro breakpoint */
}
```

Si tu proyecto tiene sus propios tokens, reemplaza las referencias en el componente:

| Clase original | Reemplazar por |
|---|---|
| `bg-vecta-lime` | tu color de fondo de la sección |
| `text-vecta-dark` | tu color de texto principal |
| `bg-vecta-dark` | tu color de fondo de botón / checkbox checked |
| `font-display` | tu fuente principal |

### Paso 3 — Agregar la regla CSS del borde de error

En tu CSS global:

```css
.form-input-validate:user-invalid {
  border-color: #b91c1c; /* o tu color de error */
}
```

### Paso 4 — Configurar HubSpot en `lead.ts`

```ts
const HUBSPOT_PORTAL_ID = 'TU_PORTAL_ID';
const HUBSPOT_FORM_ID   = 'TU_FORM_GUID';
```

Ajustar `FIELD_MAP` si los campos del proyecto difieren:

```ts
const FIELD_MAP: Record<string, string> = {
  nombre:            'firstname',
  apellido:          'lastname',
  celular:           'phone',          // ← verificar nombre interno en HubSpot
  correo:            'email',
  comentario:        'message',
  proposito:         'proposito',
  contactoTelefonico:'contacto_telefonico',
  origenContacto:    'origen_contacto',
};
```

### Paso 5 — Habilitar SSR en `astro.config.mjs`

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';  // o tu adaptador

export default defineConfig({
  output: 'server',   // o 'hybrid'
  adapter: vercel(),
});
```

Sin SSR la ruta `src/pages/api/lead.ts` no funciona porque tiene `prerender = false`.

### Paso 6 — Montar la sección en la página

```astro
---
// src/pages/index.astro
import Formulario from '../sections/Formulario.astro';
---
<Formulario />
```

### Paso 7 — Ajustar el redirect post-envío

En `Formulario.astro`, línea del script:

```ts
window.location.href = '/gracias';  // ← cambiar por la ruta de tu confirmación
```

### Adaptación a un stack distinto de Astro

Si el proyecto destino no usa Astro, los elementos críticos a portar son:

1. **HTML de la sección**: todo dentro de `<section id="formulario">` (puede usarse en React, Vue, HTML puro, etc.). Asegurarse de mantener el atributo `form="contactForm"` en el `<textarea>` y `<input[consent]>`.
2. **CSS**: añadir `.form-input-validate:user-invalid { border-color: #b91c1c }` al CSS global del proyecto.
3. **Script de submit**: trasladar el bloque `<script>` a un archivo JS/TS independiente. El endpoint al que apunta (`/api/lead`) puede ser cualquier ruta POST del backend destino.
4. **Backend proxy**: replicar la lógica de `lead.ts` en el framework del servidor destino (Express, Next.js API routes, Nuxt server routes, etc.).

---

## 12. Checklist de integración

```
[ ] Copiados Formulario.astro, lead.ts y gracias.astro
[ ] Tokens @theme añadidos (vecta-lime, vecta-dark, font-display, breakpoint-md)
[ ] Fuente Albert Sans enlazada en el <head> (o sustituida)
[ ] Regla .form-input-validate:user-invalid añadida al CSS global
[ ] HUBSPOT_PORTAL_ID y HUBSPOT_FORM_ID actualizados en lead.ts
[ ] FIELD_MAP verificado contra nombres internos de propiedades en HubSpot
[ ] SSR habilitado en astro.config.mjs (output: 'server' o 'hybrid')
[ ] Adaptador de servidor instalado (Vercel / Node / Cloudflare)
[ ] Redirect post-envío apunta a la ruta de confirmación correcta
[ ] Probado en desktop (≥ 769 px): layout dos columnas
[ ] Probado en tablet (640–768 px): columna única, campos 52px de alto
[ ] Probado en móvil (≤ 639 px): columna única, campos 46px de alto
[ ] Verificado que el spinner se muestra durante el envío
[ ] Verificado que el mensaje de error aparece cuando falta un campo requerido
[ ] Verificado que la borde roja aparece en campos inválidos tras interacción
[ ] Verificado envío real a HubSpot y aparición del contacto en el CRM
```
