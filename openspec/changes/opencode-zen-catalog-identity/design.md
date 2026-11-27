# Design: OpenCode Zen Catalog Identity

## Technical Approach

Introducir `src/lib/providerIdentity.ts` como única fuente de verdad para canonicalización,
display names y reverse-map. Aplicar cirugía quirúrgica en cuatro call-sites sin tocar la
firma de `writeOpenCodeConfig` ni alterar el schema de `opencode.json`.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| A) Canonicalizar en `parseVerboseOpencodeModelsOutput` | Un punto de ingesta, claro | ✅ Elegida |
| B) Canonicalizar en `addKnownAssignment` | Afecta todos los proveedores, difícil deshacer | ❌ Demasiado invasiva |
| A) Reverse-map en `updateModelAssignment` antes de `joinModelRef` | Capa semántica correcta; `writeOpenCodeConfig` permanece ignorante de providers | ✅ Elegida |
| B) Reverse-map dentro de `writeOpenCodeConfig` | Viola single-responsibility; el writer no debe conocer semántica de provider IDs | ❌ Rechazada |
| A) Cache migration en memoria dentro de `loadMergedModelCatalogSafe` | No toca disco; idempotente; safe | ✅ Elegida |
| B) Migrar escribiendo cache a disco | Riesgo de corrupción; requiere lock; innecesario dado TTL 30 s | ❌ Rechazada |

## Data Flow

```
opencode models --verbose
  └─ parseVerboseOpencodeModelsOutput
       └─ canonicalProviderId(parsed.providerID)   ← NUEVO  →  "opencode-zen"
            └─ addKnownAssignment(catalog, ...)

opencode providers list
  └─ parseConnectedProviders → normalizeProviderName("OpenCode Zen")  →  "opencode-zen"
       (sin cambio — ya correcto)

opencode.json agent[*].model = "opencode/<model>"
  └─ listModelAssignments
       └─ canonicalProviderId(provider)   ← NUEVO  →  "opencode-zen"

model-variants.json  key "opencode"
  └─ loadMergedModelCatalogSafe
       └─ on-read migration: seed["opencode"] → seed["opencode-zen"]   ← NUEVO (in-mem only)

UI selects "opencode-zen/<model>"
  └─ updateModelAssignment
       └─ catalogIdToCliRef("opencode-zen")  →  "opencode"   ← NUEVO
            └─ joinModelRef("opencode", model)  →  "opencode/<model>"
                 └─ writeOpenCodeConfig  (sin cambio)

createProfile / updateProfile / updateBaseProfile
  └─ catalogIdToCliRef(assignment.provider)  →  "opencode"   ← NUEVO (mismo reverse-map)
       └─ joinModelRef("opencode", model)  →  "opencode/<model>"
            └─ writeOpenCodeConfig  (sin cambio)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/providerIdentity.ts` | Create | `canonicalProviderId`, `PROVIDER_DISPLAY_NAMES`, `catalogIdToCliRef` |
| `src/services/modelCatalogService.ts` | Modify | Aplicar `canonicalProviderId` en `parseVerboseOpencodeModelsOutput` (l. 85-89); migración on-read en `loadMergedModelCatalogSafe` (antes de merge con liveResult) |
| `src/adapters/opencode.ts` | Modify | `listModelAssignments`: `canonicalProviderId(provider)` en l. 109; `updateModelAssignment`: `catalogIdToCliRef(assignment.provider)` antes de `joinModelRef` (l. 208); `createProfile`/`updateProfile`/`updateBaseProfile`: mismo `catalogIdToCliRef` en cada write-back (persistir `opencode/<model>` al CLI) |
| `src/components/molecules/ModelPicker/modelPicker.tsx` | Modify | Label: `PROVIDER_DISPLAY_NAMES[provider] ?? provider` |
| `src/lib/__tests__/providerIdentity.test.ts` | Create | Tests unitarios puros de las tres funciones |
| `src/services/__tests__/modelCatalogService.test.ts` | Modify | Fixtures con `providerID: "opencode"` → expectativas actualizadas a `"opencode-zen"` |
| `src/adapters/__tests__/opencodeWrite.test.ts` | Modify | Verificar que `updateModelAssignment` con `"opencode-zen"` escribe `"opencode/<model>"` |

## Interfaces / Contracts

```typescript
// src/lib/providerIdentity.ts

/** Mapa: ID CLI → ID canónico interno */
const CATALOG_ID_MAP: Record<string, string> = {
  opencode: "opencode-zen",
};

/** Mapa: ID canónico → label de producto */
export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  "opencode-zen": "OpenCode Zen",
  "opencode-go":  "OpenCode Go",
};

/** Normaliza IDs de ingesta al canónico interno. Idempotente. */
export function canonicalProviderId(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return CATALOG_ID_MAP[lower] ?? lower;
}

/** Reverse-map para write-back a opencode.json. Idempotente. */
export function catalogIdToCliRef(canonicalId: string): string {
  const REVERSE_MAP: Record<string, string> = { "opencode-zen": "opencode" };
  return REVERSE_MAP[canonicalId] ?? canonicalId;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `canonicalProviderId`, `catalogIdToCliRef`, `PROVIDER_DISPLAY_NAMES` | Vitest puro, sin I/O |
| Unit | `parseVerboseOpencodeModelsOutput` con fixture que emite `providerID: "opencode"` | Expectativa → clave `"opencode-zen"` |
| Unit | `loadMergedModelCatalogSafe` cache migration | Mock `readModelCacheSafe` con `{ opencode: {...} }` → resultado contiene `"opencode-zen"`, no `"opencode"` |
| Unit | `updateModelAssignment` con `provider: "opencode-zen"` | Verificar que el JSON escrito en opencode.json tiene `"opencode/<model>"` (no `"opencode-zen/<model>"`) — RED obligatorio |
| Unit | `createProfile`, `updateProfile`, `updateBaseProfile` con `provider: "opencode-zen"` | Verificar que el JSON escrito en opencode.json tiene `"opencode/<model>"` en cada write-back de perfil |
| Component | ModelPicker label con `provider = "opencode-zen"` | Expect texto visible `"OpenCode Zen"` |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary nueva. Los call-sites a `exec` existentes no se modifican.

## Migration / Rollout

No migration de disco requerida. La clave `"opencode"` en `model-variants.json` existente
migra automáticamente on-read en la primera llamada a `loadMergedModelCatalogSafe`; el cache
TTL (30 s) garantiza que la clave canónica se propague sin intervención del usuario.
Rollback: revertir el commit de `providerIdentity.ts` restaura todos los puntos. No hay
escritura permanente del nuevo ID a ningún archivo del sistema.

## Open Questions

- [ ] ¿El `ModelPicker` target es `modelPicker.tsx` o existe otro componente de selector en la página de modelos? (verificar ruta real antes de la tarea de UI)
