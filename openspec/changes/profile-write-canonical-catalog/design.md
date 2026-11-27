# Design: Profile Write Canonical Catalog

## Technical Approach

Reemplazar `readModelCacheSafe` por `loadMergedModelCatalogSafe` en los tres handlers de escritura de perfiles. El tipo de retorno es `ModelCache` en ambos casos — los adaptadores reciben el mismo tipo sin modificación. Añadir `gentleAiDir()` helper local en cada ruta (patrón ya establecido en `config/route.ts` y `models/route.ts`).

## Architecture Decisions

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Swap call-site en rutas | Mínimo cambio; respeta el patrón existente | ✅ Elegida |
| Nuevo helper en adaptador | Más indirección; adaptadores ya son agnósticos del origen | ❌ Rechazada |
| `HOME` env var vs `homedir()` | `homedir()` es portable cross-platform; `HOME` puede no estar en Windows | ✅ Usar `homedir()` como `models/route.ts:21` |

## Data Flow

```
                        [ACTUAL — ROTO]
UI (provider: "opencode-zen") → POST/PUT route
  → readModelCacheSafe        → ModelCache { opencode: {...} }
  → validateModelAssignment   → FAIL: "opencode-zen" not in catalog
  → HTTP 400 ❌

                        [TARGET — CORRECTO]
UI (provider: "opencode-zen") → POST/PUT route
  → loadMergedModelCatalogSafe → ModelCache { "opencode-zen": {...} }
  → validateModelAssignment    → PASS
  → catalogIdToCliRef("opencode-zen") → "opencode"   ← ya existe en adaptador
  → joinModelRef("opencode", model) → persisted to opencode.json ✅
```

## File Changes

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/app/api/profiles/route.ts` | Modificar | `POST`: añadir `gentleAiDir()`, swap `readModelCacheSafe` → `loadMergedModelCatalogSafe`; añadir import `homedir` |
| `src/app/api/profiles/[name]/route.ts` | Modificar | `PUT`: mismo patrón; añadir import `homedir` |
| `src/app/api/profiles/base/route.ts` | Modificar | `PUT`: mismo patrón; añadir import `homedir` |
| `src/app/api/profiles/__tests__/route.test.ts` | Modificar | Mock `loadMergedModelCatalogSafe` en lugar de `readModelCacheSafe`; fixture con clave `opencode-zen` |
| `src/app/api/profiles/[name]/__tests__/route.test.ts` | Modificar | Mismo |
| `src/app/api/profiles/base/__tests__/route.test.ts` | Modificar | Mismo |

## Interfaces / Contracts

Sin cambios de contrato. Las firmas de los adaptadores ya reciben `ModelCache`:

```typescript
// Sin cambios — adapters/opencode.ts
createProfile(configDir, name, assignments, backupDir, cacheRaw: ModelCache)
updateProfile(configDir, name, assignments, backupDir, cacheRaw: ModelCache)
updateBaseProfile(configDir, assignments, backupDir, cacheRaw: ModelCache)
```

Helper a añadir en cada ruta (patrón `models/route.ts:20-22`):
```typescript
import { homedir } from "node:os";
function gentleAiDir(): string {
  return process.env.PRESETT_TEST_GENTLE_AI_DIR ?? join(homedir(), ".gentle-ai");
}
```

Sustitución en cada handler de escritura:
```typescript
// Antes
const cacheResult = await readModelCacheSafe(cacheDir());

// Después
const cacheResult = await loadMergedModelCatalogSafe({
  cacheDir: cacheDir(),
  openCodeConfigDir: configDir(),
  gentleAiDir: gentleAiDir(),
});
```

El mapeo de error `FILE_MISSING → 503` se mantiene idéntico.

## Testing Strategy

| Capa | Qué probar | Enfoque |
|------|-----------|---------|
| Unit (RED primero) | `POST /api/profiles` con `provider: "opencode-zen"` devuelve 200 | Mock `loadMergedModelCatalogSafe` con fixture `{ "opencode-zen": { "model": [] } }` |
| Unit (RED primero) | `PUT /api/profiles/[name]` con `opencode-zen` devuelve 200 | Mismo |
| Unit (RED primero) | `PUT /api/profiles/base` con `opencode-zen` devuelve 200 | Mismo |
| Unit (regresión) | Modelo desconocido sigue devolviendo HTTP 400 | Mock catálogo sin ese modelo |
| Unit (regresión) | Catálogo no disponible sigue devolviendo HTTP 503 | Mock `loadMergedModelCatalogSafe` con `FILE_MISSING` |
| Integration | Suite completa pasa | `npm test` |

## Threat Matrix

N/A — no hay routing dinámico, shell, subprocesos, automatización VCS/PR, clasificación de ejecutables, ni integración de procesos en el cambio.

## Migration / Rollout

No migration required. El write-back a `opencode.json` persiste `opencode/<model>` sin cambios (el reverse-map `catalogIdToCliRef` ya existía). Rollback: revertir las tres rutas a `readModelCacheSafe(cacheDir())` y restaurar imports.

## Open Questions

Ninguna.
