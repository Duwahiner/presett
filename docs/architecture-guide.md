## Quick reference — Patrones más usados

### 1. Import correcto
```ts
import { Button } from "@/components/atoms/Button/Button";      // ✅
import { Button } from "@/components/atoms/Button";             // ❌ barrel
```

### 2. Archivos requeridos por *organism* / *template*
```text
ComponentName/
├── ComponentName.tsx          ← container: hooks, estado, ViewModel
├── ComponentName.view.tsx     ← presentación: solo renderiza props
├── ComponentName.types.ts     ← interfaces y tipos
└── ComponentName.styled.ts    ← @emotion/styled, sin lógica
```

### 3. Nomenclatura de archivos
| Válido (`✅`) | Inválido (`❌`) |
| :--- | :--- |
| `Component.tsx` | `ComponentView.tsx` |
| `Component.view.tsx` | `ComponentStyles.ts` |
| `Component.types.ts` | `ComponentTypes.ts` |
| `Component.styled.ts` | `index.ts` *(prohibido)* |

---

## Atomic Design

```text
components/
├── atoms/       ← Button, Input, Icon, Badge, Spinner — 2-3 archivos
├── molecules/   ← SecretField, SecurityBanner, RevealTimer… — 4 archivos
├── organisms/   ← Sidebar, ItemDetail, PermissionModal… — 4 archivos obligatorio
└── templates/   ← VaultLayout, AuthLayout — 4 archivos obligatorio
```

> **Regla de oro:** La estructura de cuatro archivos (`tsx` + `view.tsx` + `types.ts` + `styled.ts`) es **obligatoria** en *organisms* y *templates*. En *atoms*, `view.tsx` es opcional si el componente no maneja estado ni lógica propia.

---

## Patrón Container-Presentación

**Obligatorio en:** *organisms*, *templates* y *molecules* complejos.

```text
Component.tsx         ← consume hooks, orquesta estado, construye ViewModel
Component.view.tsx    ← recibe props, renderiza UI, sin lógica
Component.types.ts    ← interfaces del componente
Component.styled.ts   ← @emotion/styled, sin lógica
```

### Flujo de datos
```text
Usuario → Component.view.tsx → Component.tsx → hooks → services → API
```

### Restricciones en `Component.view.tsx`
* Prohibidas las llamadas a APIs o *services*.
* Prohibida la lógica de negocio.
* Prohibido el uso de `useEffect` con efectos secundarios.
* Prohibido el estado derivado de llamadas remotas.

---

## `@emotion/styled` — Reglas de uso

### 1. Regla General: Componentes reutilizables y personalizables
Para garantizar que los estilos puedan reutilizarse y que el componente sea verdaderamente personalizable desde el exterior, se debe aplicar el patrón de **Props de Clase y Variantes**:

* **Exponer `className`:** Todo componente de presentación (`.view.tsx`) **debe** aceptar la prop `className` y pasarla a su elemento raíz de Emotion. Esto permite inyectar utilidades de Tailwind desde el padre sin reescribir el componente.
* **Agnósticos del entorno (Sin márgenes externos):** El archivo `.styled.ts` define el interior del componente, pero **nunca** su ubicación externa (nada de `margin-top`, `position: absolute`, etc.). El espaciado exterior y la ubicación se dictan desde el padre pasándole clases de Tailwind.
* **Variantes de diseño por Props:** Las variaciones estructurales o temas (ej. `variant="primary"`) se manejan mediante las props de Emotion, encapsulando la lógica visual dentro del `.styled.ts`.

```tsx
// Component.types.ts
export interface ComponentProps {
  className?: string; // Obligatorio para personalización externa
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

// Wrapper.styled.ts (Emotion) — Estructura base y variantes
export const Wrapper = styled.div<{ variant?: 'primary' | 'secondary' }>\`
  display: flex;
  padding: 1rem;
  border-radius: 8px;
  background-color: \${(props) => props.variant === 'primary' ? '#3b82f6' : '#f3f4f6'};
\`;

// Component.view.tsx — Recibe personalización
export const ComponentView = ({ className, variant = 'primary', children }: ComponentProps) => (
  <Wrapper className={className} variant={variant}>
    {children}
  </Wrapper>
);
```

### 2. División con Tailwind: estructura vs. utilidades
Dos sistemas de estilos conviven con roles estrictos y no solapados:

* **`Component.styled.ts` (Emotion):** Define la **estructura reutilizable** e identidad del componente (la forma, estados `:hover`/`:disabled`, pseudo-selectores).
* **Clases de Tailwind:** Cubren aspectos rápidos, contextuales y puntuales sobre esa estructura (`mt-4`, `md:flex-row`, `w-full`). Se aplican como utilidades enviadas vía prop `className` desde el padre.

> **Prohibido:** Usar `@apply` dentro de archivos `.styled.ts`. No funciona sin librerías adicionales (*twin.macro* u otras), las cuales fueron descartadas explícitamente (2026-07-28) para evitar sobrecarga de dependencias.

---

## Política de imports y barrels

### Imports explícitos
```ts
// ✅ Correcto — explícito hasta el archivo
import { Button } from "@/components/atoms/Button/Button";
import { useVault } from "@/features/vault/hooks/useVault";
import { encryptAES } from "@/features/crypto/aes";

// ❌ Incorrecto — barrel / carpeta
import { Button } from "@/components/atoms/Button";
import { useVault } from "@/features/vault/hooks";
```

### Política de `index.ts`
Prohibido en todo el proyecto **excepto** en `src/types/index.ts` (único barrel permitido, limitado exclusivamente a re-exportar tipos compartidos). En cualquier otro caso, se debe importar directamente el archivo objetivo.

---

## Ubicación de pruebas (`__tests__/`)

Las pruebas residen dentro del directorio de su respectivo dominio:

```text
src/features/crypto/
├── aes.ts
├── argon2.ts
├── types/
│   └── crypto.types.ts
└── __tests__/
    ├── aes.test.ts
    ├── argon2.test.ts
    └── testSupport.ts         ← ayudantes compartidos por las pruebas
```

* **Ayudantes:** `testSupport.ts` no utiliza el sufijo `.test.ts`, evitando que el ejecutor lo interprete como una suite de pruebas.
* **Patrón del ejecutor (`package.json`):** Configurado con `src/**/*.test.ts` y `src/**/*.test.tsx`. **Incluye `.tsx` explícitamente** para asegurar que las pruebas de componentes no queden fuera del pipeline de validación.
* **Formato de nombres:** La carpeta contenedora se escribe con guiones bajos (`__tests__`) y no con guiones medios.

---

## Nomenclatura de archivos (Regla: **CONST-15**)

| Válido (`✅`) | Inválido (`❌`) |
| :--- | :--- |
| `testSupport.ts` | `test-support.ts` |
| `formatDate.ts` | `format-date.ts` |
| `Button.styled.ts` | `button-styled.ts` |

