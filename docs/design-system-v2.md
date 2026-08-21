# Guía de Estilos — PreSett (v2)

> **Propósito de este documento**
> Esta guía documenta el sistema visual de PreSett — AI Agent Configuration Manager — construido en v0 sobre Next.js + Tailwind CSS. Está pensada como especificación de referencia para que un agente de IA (o un equipo de desarrollo) migre la aplicación a otro stack o repositorio manteniendo el diseño **pixel-perfect**. Todos los valores documentados provienen de las decisiones de diseño tomadas y confirmadas durante la construcción del proyecto.

---

## 1. Concepto de diseño

**Estilo:** Brutalismo digital / terminal de control (dark-first).

Principios rectores:

- **Cero border-radius.** Todas las esquinas son rectas (`rounded-none`), salvo componentes tipo "píldora" (badges) que usan `rounded-full` intencionalmente como contraste.
- **Bordes duros y visibles.** Grosor de 1px a 2px, sólidos, sin difuminado.
- **Sombras sólidas (hard shadows).** Sin `blur`, con offset fijo (estilo "sombra proyectada" tipo neobrutalism).
- **Tipografía monoespaciada** para toda la interfaz de navegación, etiquetas y datos técnicos.
- **Alto contraste:** fondo negro puro, texto claro, acentos saturados (magenta/verde) usados con moderación como señal de estado o acción primaria.
- **Texto en mayúsculas** para navegación, labels de sección y badges de estado.
- Referencias de inspiración usadas en el proyecto: interfaces tipo "terminal / control room" (paneles oscuros, texto monoespaciado, barras de estado verdes, alertas críticas).

---

## 2. Logotipo: usos correctos

PreSett no usa un isotipo gráfico; su identidad se resuelve **tipográficamente**, como un wordmark de marca:

- **Wordmark de marca:** `PRESETT`, siempre en **mayúsculas**, tipografía monoespaciada, ubicado en la parte superior del sidebar.
- **Avatar / sello de workspace:** un bloque cuadrado (sin bordes redondeados) con las iniciales del workspace activo (ej. `GS` para "Gentleman Stack"), fondo sólido con acento de marca, texto en mayúsculas, monoespaciado y en negrita.

### Reglas de uso

| ✅ Correcto | ❌ Incorrecto |
|---|---|
| Wordmark siempre en mayúsculas | No usar minúsculas ni "Title Case" |
| Fondo negro puro detrás del wordmark | No usar sobre fondos de color medio/bajo contraste |
| Mantener tipografía monoespaciada | No sustituir por una tipografía sans/serif decorativa |
| Avatar de workspace en bloque cuadrado sólido | No aplicar `border-radius` al avatar |
| Espaciado de letras neutro/estándar | No comprimir el tracking del wordmark |

> **Nota para migración:** No existe un archivo de logotipo vectorial (SVG/PNG) independiente en el proyecto; la marca se renderiza como texto estilizado en código. Si el nuevo stack requiere un asset de logo, debe recrearse como wordmark tipográfico siguiendo esta misma especificación (no como imagen rasterizada) para mantener nitidez a cualquier resolución.

---

## 3. Colores

### 3.1 Paleta principal (marca)

| Nombre | Uso | HEX | RGB |
|---|---|---|---|
| **Negro base** | Fondo principal en dark mode, texto principal en light mode | `#000000` | `rgb(0, 0, 0)` |
| **Magenta primario** | Acciones primarias (botones "Create profile", CTAs), foco de marca — **constante en ambos temas** | `#E72286` | `rgb(231, 34, 134)` |
| **Verde acento** | Estados positivos/activos, confirmaciones, "TDD strict mode", indicadores "Enabled" | `#73EC8B` | `rgb(115, 236, 139)` |

> El magenta `#E72286` es el color de marca ancla y **se mantiene idéntico en dark y light mode** sin variación. El verde requiere una variante más oscura en light mode para legibilidad como texto (ver 3.3).

### 3.2 Modo oscuro (Dark) — tokens exactos verificados en código fuente

Extraído directamente de `app/globals.css` (`:root`, `color-scheme: dark`):

| Token | Valor HEX | Uso |
|---|---|---|
| `--background` | `#000000` | Fondo base de toda la app |
| `--foreground` | `#ffffff` | Texto principal |
| `--card` / `--popover` | `#0a0a0a` | Fondo de tarjetas y popovers (ligeramente elevado sobre el fondo) |
| `--card-foreground` / `--popover-foreground` | `#ffffff` | Texto sobre tarjetas/popovers |
| `--primary` | `#e72286` | Acciones primarias |
| `--primary-foreground` | `#ffffff` | Texto sobre elementos primarios |
| `--secondary` | `#141414` | Superficies secundarias |
| `--secondary-foreground` | `#ffffff` | Texto sobre superficies secundarias |
| `--muted` | `#121212` | Fondos atenuados |
| `--muted-foreground` | `#8f8f8f` | Texto secundario/atenuado |
| `--accent` | `#73ec8b` | Acentos verdes, estados positivos |
| `--accent-foreground` | `#000000` | Texto sobre fondo verde sólido |
| `--destructive` | `#e72286` | Acciones destructivas (comparte tono con `primary`) |
| `--success` | `#73ec8b` | Estados de éxito |
| `--success-foreground` | `#000000` | Texto sobre estado de éxito |
| `--warning` | `#73ec8b` | Estados de advertencia (comparte tono con `success` en esta paleta) |
| `--warning-foreground` | `#000000` | Texto sobre estado de advertencia |
| `--border` | `#ffffff` | Bordes de tarjetas, inputs, separadores |
| `--input` | `#2a2a2a` | Fondo de campos de formulario |
| `--ring` | `#e72286` | Anillo de foco (accesibilidad) |
| `--chart-1` … `--chart-5` | `#e72286, #73ec8b, #ffffff, #e72286, #8f8f8f` | Paleta para gráficos/datos |
| `--sidebar*` | Espejo de los tokens equivalentes (`#000000`, `#ffffff`, `#e72286`, `#73ec8b`) | Sidebar usa el mismo sistema de tokens |
| `--radius` | `0rem` | Cero radio de borde — regla brutalista no negociable |

### 3.3 Modo claro (Light) — tokens exactos verificados en código fuente

> ✅ **El modo claro ya está implementado y verificado en el código real** (`app/globals.css`, bloque `.light { ... }`) — estos ya no son valores propuestos, son los definitivos del producto.

| Token | Valor HEX | Uso |
|---|---|---|
| `--background` | `#f4f4f4` | Fondo base de toda la app (gris muy claro, **no blanco puro**) |
| `--foreground` | `#000000` | Texto principal |
| `--card` | `#ffffff` | Fondo de tarjetas y paneles (blanco puro, contrasta con el fondo gris) |
| `--card-foreground` | `#000000` | Texto sobre tarjetas |
| `--primary` | `#e72286` | Acciones primarias — **idéntico al dark mode** |
| `--primary-foreground` | `#ffffff` | Texto sobre elementos primarios |
| `--secondary` | `#e6e6e6` | Superficies secundarias |
| `--secondary-foreground` | `#000000` | Texto sobre superficies secundarias |
| `--muted` | `#ececec` | Fondos atenuados |
| `--muted-foreground` | `#5a5a5a` | Texto secundario/atenuado |
| `--accent` | `#73ec8b` | Fondo de acentos verdes (badges, chips, workspace tile) — **idéntico al dark mode** |
| `--accent-foreground` | `#000000` | Texto/ícono sobre fondo verde sólido |
| `--destructive` | `#e72286` | Acciones destructivas (comparte tono con `primary`) |
| `--success` | `#1f9d4d` | Texto/ícono de estado de éxito (verde oscurecido para contraste legible sobre fondo claro) |
| `--warning` | `#1f9d4d` | Mismo tratamiento que `success` en esta paleta |
| `--border` | `#000000` | Bordes en negro puro — alto contraste brutalista sobre fondo claro |
| `--input` | `#cfcfcf` | Fondo de campos de formulario |
| `--ring` | `#e72286` | Anillo de foco |
| `--sidebar` | `#ffffff` | **El sidebar es blanco en light mode** (se invierte por completo, no se mantiene negro) |
| `--sidebar-foreground` | `#000000` | Texto del sidebar |
| `--sidebar-primary` | `#e72286` | Acento primario dentro del sidebar |
| `--sidebar-accent` | `#73ec8b` | Acento verde dentro del sidebar (ej. tile de workspace activo) |
| `--sidebar-border` | `#000000` | Borde del sidebar |
| `--sidebar-ring` | `#e72286` | Anillo de foco dentro del sidebar |
| `--radius` | `0rem` | Se mantiene igual — regla no negociable en ambos temas |

**Reglas confirmadas de la paleta light:**
- El magenta `#e72286` y el verde `#73ec8b` **no cambian** entre temas — son las anclas de identidad de marca.
- El fondo base **no es blanco puro**: es un gris muy claro `#f4f4f4`, mientras que tarjetas y paneles sí usan blanco puro `#ffffff` — esta diferencia sutil crea jerarquía visual (el contenido "flota" sobre el fondo).
- El verde de acento se oscurece a `#1f9d4d` únicamente para uso como **texto/ícono** (estados de éxito), mientras que como **fondo sólido** (badges, tiles) se mantiene el verde de marca `#73ec8b` puro.
- Los bordes son negro puro `#000000` en ambos elementos, tarjetas y sidebar — el alto contraste brutalista se conserva íntegro en modo claro.
- **El sidebar se invierte a blanco** (`#ffffff`) en light mode — a diferencia de lo que podría asumirse, no se mantiene fijo en negro entre temas; sigue exactamente la misma lógica de inversión que el resto de la interfaz.

### 3.4 Colores semánticos derivados (opacidad)

Estos tonos se construyen a partir de la paleta principal usando opacidad (utilidades tipo `bg-accent/15`, `border-accent/50` de Tailwind), aplican igual en ambos temas ya que se calculan sobre el token `accent` correspondiente:

| Token de uso | Base | Opacidad aplicada | Ejemplo de uso |
|---|---|---|---|
| Fondo de badge "Configured / Active" | `accent` | 15% (`/15`) | Fondo translúcido de píldora de estado |
| Borde de badge "Configured / Active" | `accent` | 50% (`/50`) | Borde sutil de la píldora |
| Texto de badge de estado | `accent-foreground` | 100% | Texto e icono dentro del badge (usa la variante oscura en light mode) |
| Punto de notificación (bell) | `primary` | 100% | Indicador de notificación nueva |
| Avatar de usuario | `primary` | 100% (fondo sólido) | Círculo/botón de perfil en el header |

> **Nota técnica de implementación:** los colores están definidos como **CSS variables** en `app/globals.css` (sistema de theming de shadcn/Tailwind: `--background`, `--foreground`, `--primary`, `--accent`, `--border`, etc.), no como valores hardcodeados en cada componente. Para la migración, se recomienda mantener este mismo patrón de *design tokens*, agregando ahora el bloque `.light { ... }` (o `@media (prefers-color-scheme: light)`) con los valores de la sección 3.3, en vez de escribir HEX directo en el código de componentes.

---

## 4. Tipografía

### 4.1 Familias tipográficas

| Familia | Uso | Rol |
|---|---|---|
| **Monoespaciada** (JetBrains Mono o equivalente) | Navegación (sidebar), labels de sección, badges de estado, datos/valores técnicos, wordmark de marca | Tipografía dominante de la identidad brutalista |
| **Sans-serif** (Inter o equivalente) | Texto de contenido largo/descripciones donde se requiere mayor legibilidad | Tipografía secundaria de apoyo |

### 4.2 Jerarquía y tamaños

| Nivel | Tamaño aprox. | Peso | Transformación | Uso |
|---|---|---|---|---|
| Wordmark / marca (sidebar) | Base–lg | Bold | MAYÚSCULAS | "PRESETT" |
| Título de página (H1) | lg–xl | Bold | Normal / mixto | Encabezados de pantalla (Dashboard, Settings…) |
| Título de sección (H2) | base–lg | Semibold/Bold | Normal | "Quick actions", "Installed agents" |
| Item de navegación (sidebar) | sm | Semibold | MAYÚSCULAS | "DASHBOARD", "AGENTS" |
| Texto de badge / estado | **11px** (`text-[11px]`) | Bold | MAYÚSCULAS | "CONFIGURED", "PARTIAL", "ACTIVE" |
| Texto de botón/acción | sm | Bold | Normal / mixto | "Configure models", "Switch SDD profile" |
| Texto secundario / descripción | sm–xs | Regular | Normal | Subtítulos bajo un Quick Action |

### 4.3 Reglas específicas confirmadas

- Los **badges de estado** usan explícitamente: `font-mono`, `text-[11px]`, `font-bold`, `leading-4`, en mayúsculas.
- Los **labels de navegación** del sidebar van siempre en mayúsculas.
- El **line-height** de los badges se fija en `leading-4` (evitar el `line-height` por defecto, que generaba badges "abultados").
- Evitar tipografías con proporciones anchas o redondeadas: la identidad depende de una monoespaciada de trazo técnico/terminal.

### 4.4 Espaciado de texto (letter-spacing / padding interno)

- Los textos en mayúsculas (nav, badges) no llevan tracking expandido adicional — se mantiene el tracking natural de la fuente monoespaciada.
- Padding horizontal estándar en badges/píldoras: `px-2` a `px-3` (ajustado iterativamente para evitar exceso de aire).
- Altura estándar final de badge/píldora: **28px** (`h-7`).

---

## 5. Elementos gráficos

### 5.1 Iconografía

- **Librería:** [`lucide-react`](https://lucide.dev) — set de iconos de línea, consistente en grosor de trazo.
- **Regla de oro confirmada durante el desarrollo:** *cada acción o estado debe tener un ícono único*; no repetir el mismo ícono en dos elementos visibles simultáneamente en la misma vista (se corrigió explícitamente un caso donde 3 Quick Actions compartían el ícono `SlidersHorizontal`).

**Mapa de iconos por función (confirmado en el proyecto):**

| Ícono (`lucide-react`) | Función |
|---|---|
| `FileCog` | Acción "Configure models" |
| `SlidersHorizontal` | Acción "Switch SDD profile" |
| `RotateCcw` | Acción "Restore backup" |
| `RefreshCw` | Botones de acción "Restore" / "Sync" (en tarjetas de agentes) |
| `Loader` | Badge de estado "Partial" (evita repetir `RefreshCw`) |
| `Check` (o similar) | Badge de estado "Configured" / "Active" |
| `ArrowRight` | Indicador de navegación al final de un Quick Action |
| `Sun` / `Moon` | Toggle de tema claro/oscuro |
| Ícono de campana | Notificaciones (con punto magenta superpuesto si hay novedades) |

**Tamaño estándar de ícono:** 16–18px (`size={16}` / `size={18}` según contexto: interior de botón vs. dentro de badge).

### 5.2 Badges / píldoras de estado

Componente reutilizado en toda la app para comunicar estado (`Configured`, `Partial`, `Active`, `Pinned`, `Allowed`):

- Forma: píldora (`rounded-full`), **no** rectángulo — se corrigió explícitamente un estado inicial con rectángulos sólidos por el estándar de píldora sutil.
- Fondo: color semántico al 15% de opacidad (translúcido).
- Borde: color semántico al 50% de opacidad.
- Texto + ícono: color semántico al 100%, monoespaciado, 11px, bold, mayúsculas.
- Altura fija: 28px (`h-7`).
- Padding horizontal: `px-3`.
- Un ícono contextual siempre acompaña el texto (nunca solo texto).

### 5.3 Botones

- **Primario:** fondo magenta sólido `#E72286`, esquinas rectas, borde y/o sombra dura sin blur. Uso: acciones principales como "Create profile".
- **Secundario / outline:** borde de 1–2px, fondo transparente o negro, texto claro.
- **Botones de ícono** (tema, notificaciones, avatar): forma cuadrada o circular contenida en un control compacto dentro del header.
- Ningún botón usa `border-radius` grande; se respeta la línea recta general, salvo excepciones puntuales de controles tipo toggle segmentado (sol/luna) que sí usan bordes redondeados como contenedor del control.

### 5.4 Tarjetas (cards) y paneles

- Borde sólido de **2px** (`border-2 border-border`) — más grueso que el borde estándar de 1px usado en separadores menores.
- Sin `border-radius` (esquinas rectas).
- Fondo con el token `--card`: negro casi puro (`#0a0a0a`) en dark mode, blanco puro (`#ffffff`) en light mode — siempre en contraste con el fondo general (`--background`), que es un tono ligeramente distinto en ambos temas.
- Uso de sombra dura (offset sólido, sin blur) para dar sensación de profundidad "recortada", no difusa.
- Tarjeta de estado positivo destacado (ej. "TDD strict mode / Enabled"): fondo verde de acento, texto oscuro/contrastante, para funcionar como bloque de confirmación visualmente distinto del resto de tarjetas neutras.
- Tarjeta "Add agent" (estado vacío / acción de agregar): borde punteado (`dashed`), diferenciándose de las tarjetas de contenido activo.

### 5.5 Layout — dimensiones estructurales confirmadas

| Elemento | Valor |
|---|---|
| Altura del header | **72px** |
| Ancho del sidebar | **260px** |
| Grosor de borde estándar (separadores, inputs) | 1px |
| Grosor de borde de tarjetas | 2px |
| Espaciado general | Compacto — se redujo intencionalmente el padding/spacing original para lograr una densidad de información más "terminal" y menos "SaaS suave" |

### 5.6 Sombras

- Sombras **sólidas** (hard shadows), sin `blur-radius`.
- Offset fijo y visible, coherente con la estética neobrutalista (efecto de "elemento flotando sobre su propia sombra recortada").
- No usar sombras suaves/difusas tipo Material Design ni glassmorphism.

---

## 6. Resumen rápido para el agente de migración

```
/* — DARK MODE (verificado en código fuente) — */
DARK_BACKGROUND     = #000000
DARK_FOREGROUND     = #ffffff
DARK_CARD           = #0a0a0a
DARK_BORDER         = #ffffff
DARK_MUTED_FG       = #8f8f8f
DARK_INPUT          = #2a2a2a
DARK_SIDEBAR_BG     = #000000

/* — LIGHT MODE (verificado en código fuente) — */
LIGHT_BACKGROUND    = #f4f4f4   /* gris muy claro, NO blanco puro */
LIGHT_FOREGROUND    = #000000
LIGHT_CARD          = #ffffff   /* blanco puro — contrasta con el fondo gris */
LIGHT_BORDER        = #000000
LIGHT_MUTED_FG      = #5a5a5a
LIGHT_INPUT         = #cfcfcf
LIGHT_SUCCESS_TEXT  = #1f9d4d   /* verde oscurecido, solo para texto/ícono */
LIGHT_SIDEBAR_BG    = #ffffff   /* el sidebar SE INVIERTE a blanco en light mode */

/* — CONSTANTES DE MARCA (idénticas en ambos temas) — */
COLOR_PRIMARY       = #E72286   /* botones primarios, acciones clave, acentos de marca */
COLOR_ACCENT_BG     = #73EC8B   /* fondo de estados positivos, badges "Configured/Active" — igual en ambos temas */
COLOR_ACCENT_FG_DARK  = #000000 /* texto/ícono sobre verde en dark mode */
COLOR_ACCENT_FG_LIGHT = #000000 /* texto/ícono sobre verde SÓLIDO en light mode (igual que dark) */

TIPOGRAFÍA_NAV     = monoespaciada, MAYÚSCULAS, bold
TIPOGRAFÍA_BADGE   = monoespaciada, 11px, bold, MAYÚSCULAS, leading-4
TIPOGRAFÍA_BODY    = sans-serif (Inter o equivalente) para texto largo

RADIO_DE_BORDE     = 0 (rounded-none) EXCEPTO badges (rounded-full)
BORDE_TARJETA      = 2px sólido
BORDE_ESTÁNDAR     = 1px sólido
SOMBRA             = sólida, sin blur, offset fijo

HEADER_HEIGHT      = 72px
SIDEBAR_WIDTH      = 260px
BADGE_HEIGHT       = 28px (h-7)

ICONOS             = lucide-react — 1 ícono único por acción/estado, sin repetir en la misma vista
```

---

## 7. Notas y limitaciones de esta guía

- Los valores de color, tipografía y componentes documentados aquí se extrajeron directamente de las decisiones de diseño confirmadas durante la construcción del proyecto en v0 (chat *PreSett-v2*), incluyendo correcciones explícitas hechas por el propietario del producto (tamaños de badge, iconos duplicados, colores de botón, etc.).
- Los tokens de las secciones 3.2 (dark mode) y 3.3 (light mode) se verificaron por **lectura directa del código fuente actual** (`app/globals.css`), no por inferencia — son exactos y están confirmados como implementados y funcionales.
- No existe un archivo de logotipo gráfico (SVG/PNG); la marca se resuelve 100% tipográficamente, tal como se describe en la sección 2.

### 7.1 Modo claro (Light) — estado actual: implementado y funcional

El modo claro fue añadido posteriormente al proyecto y **ya está implementado, verificado y funcional** en el código fuente (confirmado por lectura directa de `app/globals.css` y `components/presett-app.tsx`):

- `app/globals.css` ahora define **dos bloques de tokens**: `:root` (dark, por defecto) y `.light { color-scheme: light; ... }`, este último redefiniendo todas las variables CSS relevantes dentro de ese scope.
- El estado `dark` (`useState(true)` en el componente raíz) controla la clase aplicada al contenedor principal: `cn('presett-shell ... bg-background text-foreground', !dark && 'light')`.
- Cuando el usuario activa el toggle sol/luna, se añade la clase `.light` al contenedor raíz, y `@layer base { .light { background-color: var(--background); color: var(--foreground); } }` fuerza el repintado. **El toggle tiene efecto visual real** en todo el árbol de componentes que consume los tokens vía Tailwind (`bg-background`, `text-foreground`, `bg-sidebar`, etc.).
- Los valores exactos de ambos modos están documentados en las secciones 3.2 (dark) y 3.3 (light) de esta guía.

**Diferencia clave a tener en cuenta en la migración:** el **sidebar se invierte a blanco** en modo claro (no se mantiene negro constante). Toda la interfaz — sidebar incluido — sigue una lógica de inversión completa entre temas, con el negro puro (`#000000`) reservado exclusivamente para bordes y texto en ambos modos, nunca como color de fondo fijo del sidebar.
