# Base Stack: React + TypeScript

Este documento define el stack base transversal recomendado para iniciar cualquier proyecto moderno con React y TypeScript, estructurado para maximizar el rendimiento, la escalabilidad y la experiencia de desarrollo (DX).

> **Actualizado (ago 2026):** se añadieron correcciones sobre el rename de `middleware.ts` → `proxy.ts` en Next.js 16, la eliminación de `next lint`, y una nota sobre alternativas de autenticación. Los cambios respecto a la versión anterior están marcados con 🆕.

---

## 1. Núcleo Universal (Cliente)

Estas dependencias conforman la base de la interfaz y la lógica de negocio, independientes del framework de renderizado:

| Categoría | Paquete(s) | Función / Patrón de uso |
| :--- | :--- | :--- |
| **UI Core** | `react`, `react-dom`, `typescript` | La base del proyecto. (TS fijado en 6.x temporalmente, ver sección de tooling). |
| **Estilos (Utilidades)** | `tailwindcss`, `@tailwindcss/postcss` | Framework principal de diseño. |
| **Componentes Accesibles**| `@headlessui/react` | Lógica de accesibilidad y estado. |
| **Estilos (CSS-in-JS)** | `@emotion/react`, `@emotion/styled` | Sistema para encapsular estilos ligados al componente. |
| **Composición UI** | `clsx`, `lucide-react` | Unión condicional de clases limpia e iconografía ligera y estandarizada. |
| **Formularios** | `react-hook-form` | Gestión de estado de formularios no controlados. Se implementa en el Container para inyectar solo `register` y `errors` a la Presentación. |
| **Validación** | `zod`, `@hookform/resolvers` | Esquemas compartidos. Único lenguaje de validación para `react-hook-form` y rutas del servidor. |
| **Cliente HTTP** | `axios` | Abstracción sobre fetch para simplificar el uso de interceptores y modularizar peticiones en servicios. |
| **Generación IDs** | `@paralleldrive/cuid2` | Creación segura de identificadores únicos directamente en el navegador antes de interactuar con el backend. |

> **Regla de Arquitectura Visual:**
> **Tailwind v4** gestiona las utilidades, mientras **Headless UI** resuelve componentes accesibles complejos (Dropdowns, Tabs, Dialogs). Se puede integrar **Emotion** si el proyecto requiere un patrón estricto de archivos `.styled.ts` para separar la presentación de la lógica.

---

## 2. Capa de Testing (Transversal)

Reemplazo moderno y nativo en ESM para los ecosistemas antiguos basados en Jest:

* **`vitest`**: Test runner de altísima velocidad compatible con la configuración de Vite.
* **`happy-dom`**: Simulación del DOM en memoria (más rápido y ligero que `jsdom`).
* **`@testing-library/react`**: Renderizado y aserciones orientadas a la accesibilidad del componente.
* **`@testing-library/user-event`**: Simulación de interacciones de usuario reales (clicks, type) en lugar de eventos sintéticos.
* **`@vitest/coverage-v8`**: Motor integrado para los reportes de cobertura de código.

---

## 3. Entornos de Ejecución

### Opción A: Next.js (Full-Stack / App Router)
Para proyectos que manejan frontend y backend (APIs, SSR) en un mismo repositorio.

* **Framework**: `next` (v16.x).
* **Gestión de Sesión**: `next-auth` (v5 — *Requerida para compatibilidad total con App Router*).
  * 🆕 **Alternativa a evaluar:** `next-auth` v5 sigue considerándose por muchos como "beta estable" y varios equipos en 2026 están migrando a **Better Auth**, que evita depender de una query a la base de datos por request (mejor compatibilidad con edge/`proxy.ts`) y no requiere workarounds documentados para App Router. Si el proyecto no arrastra una base de código existente con NextAuth, vale la pena comparar ambas antes de fijar la dependencia.
  * 🆕 **Importante:** los ejemplos de `next-auth` v5 con middleware suelen basarse en `middleware.ts`, que **ya no es válido en Next.js 16** (ver sección de Reglas de Tooling más abajo). Hay que adaptar la configuración al nuevo `proxy.ts`.
* **ORM & Base de Datos**: `@prisma/client` (v7) + Driver adapter específico (ej. `@prisma/adapter-mariadb`). Prisma 7 tiene una arquitectura "Rust-free" y **exige** el uso de driver adapters; el setup de versiones anteriores no es compatible sin migrarlo.
* **Seguridad de Capas**: `server-only` (Previene la importación accidental de código de base de datos o secretos en componentes del cliente).

### Opción B: Vite (Single Page Application)
Para proyectos puramente frontend (CSR) consumiendo APIs externas.

* **Bundler & Dev Server**: `vite`.
* **Resolución de Paths**: `vite-tsconfig-paths` (Vital para que Vite y Vitest logren entender los alias de directorios como `@/*` definidos en el `tsconfig.json`).

---

## 4. Reglas Estrictas de Tooling (Evitar roturas)

Para garantizar que el Definition of Done sea alcanzable y el pipeline no falle en la inicialización, respeta estas restricciones de versiones en tu `package.json`:

1. **Fijar TypeScript (`< 7.0.0`)**: Se recomienda la versión `6.0.3`. TypeScript 7.0 llegó a GA en julio de 2026 con un compilador nativo en Go, pero **todavía no trae API programática estable** (llega en 7.1). `typescript-eslint` no soporta TS 7 aún — instalarlo junto con `typescript-eslint@8.x` produce errores `ERESOLVE` y, forzando la instalación, ESLint crashea. Mantente en la línea 6.0.x hasta que `typescript-eslint` confirme soporte para 7.x.
2. **Fijar ESLint (`< 10.0.0`)**: Se recomienda la versión `9.39.5`. `eslint-config-next` tiene un issue abierto de incompatibilidad con ESLint 10 (peer dependency conflicts en `eslint-plugin-react`, `eslint-plugin-import`, `eslint-plugin-jsx-a11y`, entre otros). No actualices hasta que Vercel publique soporte oficial.
3. 🆕 **Next.js 16 eliminó `next lint`**: el comando ya no existe y `next build` **no vuelve a correr linting automáticamente**. Hay que:
   - Agregar `"lint": "eslint ."` al `package.json`.
   - Migrar a flat config (`eslint.config.mjs`) si el proyecto todavía usa `.eslintrc.*` — `eslint-config-next` ya expone `eslint-config-next/core-web-vitals` y `eslint-config-next/typescript` en formato flat.
   - Vercel provee un codemod oficial para automatizar la migración: `npx @next/codemod@canary next-lint-to-eslint-cli .`
4. 🆕 **Next.js 16 renombró `middleware.ts` a `proxy.ts`**: el archivo debe exportar una función nombrada `proxy` (o un export default). Esto rompe directamente los ejemplos estándar de `next-auth` v5 basados en middleware — hay que adaptar `auth.config.ts` / `proxy.ts` al nuevo contrato antes de asumir que la guía oficial de NextAuth funciona tal cual con Next 16.
5. **Formato Constante**: `prettier` como única fuente de verdad para el formateo de código.
