# Design: OpenCode Zen Auth Alias

## Enfoque técnico

Revertir la canonicalización global `opencode` → `opencode-zen` de tres puntos de ingesta y eliminar los mapas inversos. La correlación entre la señal auth `opencode-zen` (CLI) y el catalog ID `opencode` se concentra en **un único sitio**: `normalizeProviderName` en `providerAuthService.ts`. El marcador y label en `ModelPicker` derivan de esa correlación sin tocar config ni write-back.

## Decisiones de arquitectura

| Decisión | Opción elegida | Rechazada | Razón |
|----------|---------------|-----------|-------|
| Dónde vive el mapping auth→catalogId | `normalizeProviderName` en `providerAuthService.ts` | `providerIdentity.ts` con un nuevo mapa | `normalizeProviderName` ya convierte display names de CLI; es el único lugar que conoce el output de `opencode providers list` |
| Label dinámica (con/sin Zen) | `resolveProviderLabel(id, isConnected)` exportada de `providerIdentity.ts` | Dos `PROVIDER_DISPLAY_NAMES` separados | Una sola función elimina duplicación; el componente ya sabe `isConnected` |
| Eliminar `canonicalProviderId` y `catalogIdToCliRef` | Borrar funciones y sus usos | Dejar como identidades (pass-through) | Identidades son deuda cognitiva sin valor; borrar es más seguro que comentar |

## Flujo de datos

```
opencode providers list
        │
        ▼
parseConnectedProviders()          → ConnectedProvider[]  (name: "OpenCode Zen")
        │
        ▼
normalizeProviderName("OpenCode Zen") → "opencode"        ← único punto de mapping
        │
        ▼
GET /api/models: connectedProviders = ["opencode", ...]
        │
        ▼
ModelPicker: connectedSet.has("opencode") → true
        │
        ├── marker bg-success visible
        └── resolveProviderLabel("opencode", true) → "OpenCode Zen"

opencode models --verbose
        │
        ▼
parseVerboseOpencodeModelsOutput() providerID: "opencode"  ← sin canonicalProviderId
        │
        ▼
catalog: { "opencode": { ... } }   ← clave nativa, sin migración on-read
```

## Cambios de archivos

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/lib/providerIdentity.ts` | Modificar | Eliminar `CATALOG_ID_MAP`, `REVERSE_MAP`, `canonicalProviderId`, `catalogIdToCliRef`. Cambiar `PROVIDER_DISPLAY_NAMES` a clave `"opencode"`. Añadir `resolveProviderLabel(id, isConnected)` |
| `src/services/providerAuthService.ts` | Modificar | `normalizeProviderName`: `"opencode zen"` → `"opencode"` (no `"opencode-zen"`) |
| `src/services/modelCatalogService.ts` | Modificar | `parseVerboseOpencodeModelsOutput`: eliminar llamada a `canonicalProviderId`; ingestar `providerID` tal cual |
| `src/adapters/opencode.ts` | Modificar | Eliminar todas las llamadas a `canonicalProviderId` y `catalogIdToCliRef` (6 sitios) |
| `src/components/molecules/ModelPicker/modelPicker.tsx` | Modificar | Usar `resolveProviderLabel(option, isConnected)` en lugar de `PROVIDER_DISPLAY_NAMES[option]` |
| `src/lib/__tests__/providerIdentity.test.ts` | Modificar | Reemplazar tests de `canonicalProviderId`/`catalogIdToCliRef` con tests de `resolveProviderLabel` |
| `src/services/__tests__/modelCatalogService.test.ts` | Modificar | Fixtures con `providerID: "opencode"` (revertir los que usen `"opencode-zen"`) |

## Interfaces / Contratos

```typescript
// src/lib/providerIdentity.ts — forma final

/** Label base por catalog ID (sin auth activa). */
export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  "opencode":    "OpenCode",
  "opencode-go": "OpenCode Go",
};

/** Label cuando auth está activa para ese catalog ID. */
const AUTH_DISPLAY_NAMES: Record<string, string> = {
  "opencode": "OpenCode Zen",
};

/**
 * Devuelve el label visible para un proveedor.
 * isConnected = true  → label de suscripción activa (ej. "OpenCode Zen")
 * isConnected = false → label base (ej. "OpenCode")
 */
export function resolveProviderLabel(catalogId: string, isConnected: boolean): string {
  if (isConnected && AUTH_DISPLAY_NAMES[catalogId]) {
    return AUTH_DISPLAY_NAMES[catalogId];
  }
  return PROVIDER_DISPLAY_NAMES[catalogId] ?? catalogId;
}
```

```typescript
// src/services/providerAuthService.ts — cambio puntual en normalizeProviderName
const mappings: Record<string, string> = {
  "opencode go":  "opencode-go",
  "opencode zen": "opencode",   // ← era "opencode-zen"
  "openai":       "openai",
  // ...resto sin cambios
};
```

## Estrategia de testing

| Capa | Qué probar | Enfoque |
|------|-----------|---------|
| Unit | `resolveProviderLabel` con `isConnected true/false` | Vitest puro, sin DOM |
| Unit | `normalizeProviderName("OpenCode Zen")` → `"opencode"` | Vitest puro |
| Unit | `parseVerboseOpencodeModelsOutput` produce `providerID: "opencode"` | Fixture file existente, revertir snapshot |
| RED | `ModelPicker` con `connectedProviders=["opencode"]` muestra marker y label "OpenCode Zen" | Vitest + jsdom |
| RED | `ModelPicker` sin `connectedProviders` muestra label "OpenCode" sin marker | Vitest + jsdom |
| Regresión | `npm test` exit 0, sin nuevos `FAIL` | CI |

## Threat Matrix

N/A — sin routing nuevo, subprocesos adicionales, ni clasificación de ejecutables. `normalizeProviderName` opera sobre string literal fijo del CLI output, no sobre input de usuario.

## Migración / Rollout

Sin migración de datos. El catalog se regenera desde `opencode models --verbose` en el próximo request. Configs existentes en `opencode.json` ya usan clave `opencode`; no requieren cambio.

## Preguntas abiertas

- [ ] Confirmar en entorno real que `opencode providers list` emite exactamente `"OpenCode Zen"` (con espacio, case exacto) y no variantes como `"Opencode Zen"` o `"opencode-zen"`. De no ser así, ajustar el `mappings` en `normalizeProviderName`.
