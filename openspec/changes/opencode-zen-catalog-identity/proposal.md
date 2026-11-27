# Proposal: OpenCode Zen Catalog Identity

## Intent

La CLI de OpenCode emite dos identificadores distintos para el mismo proveedor según el comando invocado:

- `opencode models --verbose` → campo `providerID: "opencode"` en cada bloque JSON → clave de catálogo `"opencode"`
- `opencode providers list` → línea `"OpenCode Zen api"` → `normalizeProviderName` → `"opencode-zen"` en `connectedProviders`

Resultado: `catalog["opencode"]` vs `connectedProviders.has("opencode-zen")` nunca coinciden → el marcador verde no aparece y la UI muestra el nombre técnico `"opencode"` en lugar de `"OpenCode Zen"`.

## Root Cause Evidence

| Punto de ingesta | Archivo | ID emitido |
|------------------|---------|------------|
| `parseVerboseOpencodeModelsOutput` → `parsed.providerID` | `src/services/modelCatalogService.ts:85` | `"opencode"` |
| `normalizeProviderName("OpenCode Zen")` | `src/services/providerAuthService.ts:177` | `"opencode-zen"` |
| `listModelAssignments` → `entry.model.split("/")[0]` | `src/adapters/opencode.ts:106` | `"opencode"` (desde opencode.json) |
| `readModelCacheSafe` → `model-variants.json` key | `src/services/modelCacheService.ts:37` | `"opencode"` (datos históricos) |

## Scope

### In Scope
- Canonicalizar `"opencode"` → `"opencode-zen"` en todos los puntos de ingesta del catálogo
- Agregar capa de display names: `"opencode-zen"` → `"OpenCode Zen"` en la UI
- Reverse-map en write-back: `"opencode-zen"` → `"opencode"` al escribir refs en opencode.json (para no romper la CLI)
- Migración del cache `model-variants.json`: clave `"opencode"` existente → `"opencode-zen"` on-read, sin escritura destructiva

### Out of Scope
- Modificar el binario de opencode CLI
- Renombrar otros proveedores (openai, google, anthropic, etc.)
- Migración de datos históricos en sqlite de usage stats (providerID almacenado allí es propiedad de la CLI)

## Capabilities

### New Capabilities
- `provider-id-catalog`: función pura `canonicalProviderId(raw: string): string` y mapa `PROVIDER_DISPLAY_NAMES`; maneja normalización de ingesta y display en un único lugar

### Modified Capabilities
- `models-page`: el selector de proveedor muestra `PROVIDER_DISPLAY_NAMES[id] ?? id` en lugar del ID crudo; el `connectedSet` opera sobre IDs canónicos ya normalizados (sin cambio de lógica)

## Approach

**Un archivo nuevo + cirugía quirúrgica en cuatro puntos existentes:**

1. **`src/lib/providerIdentity.ts`** (nuevo) — exporta `canonicalProviderId(raw)` y `PROVIDER_DISPLAY_NAMES`. Regla única: `"opencode"` → `"opencode-zen"`.

2. **`modelCatalogService.ts` — `parseVerboseOpencodeModelsOutput`** — aplicar `canonicalProviderId(provider)` antes de `addKnownAssignment` (línea 88-89).

3. **`opencode.ts` — `listModelAssignments`** — aplicar `canonicalProviderId(provider)` al campo `provider` antes de retornar. Write-back inverso: agregar `catalogIdToCliRef(providerId): string` que reverse-mapea `"opencode-zen"` → `"opencode"` para construir el model ref al guardar en opencode.json.

4. **`modelCatalogService.ts` — `loadMergedModelCatalogSafe`** — después de aplicar el `cacheResult`, migrar on-read: si `seed["opencode"]` existe y `seed["opencode-zen"]` no, renombrar la clave (sin escritura a disco; solo en memoria).

5. **UI: `ModelPicker` / selector de provider** — usar `PROVIDER_DISPLAY_NAMES[provider] ?? provider` para la etiqueta visible; el valor interno sigue siendo el ID canónico.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/providerIdentity.ts` | New | Mapa de canonicalización y display names |
| `src/services/modelCatalogService.ts` | Modified | Normalizar ID en `parseVerboseOpencodeModelsOutput` + migración on-read |
| `src/adapters/opencode.ts` | Modified | Normalizar en `listModelAssignments`; reverse-map en write-back |
| `src/services/providerAuthService.ts` | No change | `normalizeProviderName` ya emite `"opencode-zen"` correctamente |
| `src/components/molecules/ModelPicker/modelPicker.tsx` | Modified | Display name en etiqueta de proveedor |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| opencode.json escribe `"opencode-zen/<model>"` → CLI no lo reconoce | High si no se hace reverse-map | `catalogIdToCliRef` obligatorio antes de cualquier write a config |
| Cache en disco tiene `"opencode"` coexistiendo con `"opencode-zen"` después del fix | Medium | Migración on-read en memoria; el cache se sobreescribe en el próximo sync |
| Tests usan fixture con `providerID: "opencode"` → fallan tras el fix | Medium | Actualizar fixtures y snapshots de tests existentes |

## Rollback Plan

El archivo `providerIdentity.ts` es la única fuente de verdad de la normalización. Revertir el commit que lo introduce restaura todos los puntos al estado anterior. No hay escritura permanente a disco con el nuevo ID: `model-variants.json` se regenera desde la CLI en cada sesión.

## Dependencies

- Ninguna externa. Depende del comportamiento actual de `opencode models --verbose` y `opencode providers list`.

## Success Criteria

- [ ] `GET /api/models` devuelve `catalog` con clave `"opencode-zen"` (no `"opencode"`)
- [ ] `GET /api/models` devuelve `connectedProviders: ["opencode-zen"]` cuando la credential está activa
- [ ] El selector de proveedor muestra `"OpenCode Zen"` como etiqueta y el marcador verde aparece
- [ ] `PUT /api/config` sigue escribiendo `opencode/<model>` en opencode.json (reverse-map activo)
- [ ] Suite de tests pasa sin regresiones (`npm test` exit 0)
- [ ] Instalaciones existentes con `model-variants.json` antiguo no pierden datos; migran transparentemente on-read
