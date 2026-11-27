# Proposal: OpenCode Zen Auth Alias

## Intent

La canonicalización global `opencode` → `opencode-zen` introducida en `opencode-zen-catalog-identity`
generó regresiones en write-back, perfiles y catálogo porque reemplazó el ID técnico que la CLI
y el almacenamiento persistido esperan. El usuario aprobó revertirla.

Este cambio adopta un enfoque de alias de autenticación: `opencode` permanece como ID canónico
en catálogo, configuración, perfiles y write-back. La señal `opencode-zen` emitida por
`opencode providers list` se correlaciona con el provider `opencode` únicamente para mostrar
la etiqueta **OpenCode Zen** y el marcador verde de suscripción activa. Sin suscripción Zen,
`opencode` sigue visible y funcional, sin marcador.

## Scope

### In Scope
- Correlación auth: señal `opencode-zen` → provider catálogo `opencode` → marcador verde + etiqueta "OpenCode Zen"
- Display name `"OpenCode Zen"` para el provider `opencode` cuando la suscripción está activa
- Display name `"OpenCode"` (sin marcador) cuando la suscripción no está activa
- Eliminar cualquier canonicalización `opencode` → `opencode-zen` introducida por `opencode-zen-catalog-identity`
- Eliminar cualquier migración on-read de clave de catálogo (`"opencode"` → `"opencode-zen"` en memoria)

### Out of Scope
- Cambiar el ID `opencode` en catálogo, opencode.json, o write-back — NUNCA
- Renombrar otros proveedores
- Modificar el binario de opencode CLI
- Migración de datos históricos en sqlite de usage stats

## Capabilities

### New Capabilities
- Ninguna — el alias de auth es lógica display-only dentro de las capacidades existentes

### Modified Capabilities
- `models-page`: correlacionar `connectedProviders.has("opencode-zen")` con clave de catálogo `"opencode"` para aplicar marcador y label; eliminar normalización de ID en ingesta

## Approach

**Revertir la canonicalización + alias display-only en un único punto:**

1. **`src/lib/providerIdentity.ts`** — si existe, eliminar o vaciar `canonicalProviderId`.
   Mantener solo `PROVIDER_DISPLAY_NAMES` con mapeo display para UI: `"opencode"` → `"OpenCode Zen"` (cuando auth activa) o `"OpenCode"` (sin auth). La función `catalogIdToCliRef` deja de ser necesaria.

2. **`modelCatalogService.ts` — `parseVerboseOpencodeModelsOutput`** — revertir aplicación de `canonicalProviderId`; el campo `providerID: "opencode"` se ingesta tal cual.

3. **`modelCatalogService.ts` — `loadMergedModelCatalogSafe`** — eliminar migración on-read de clave (`"opencode"` → `"opencode-zen"`). El catálogo conserva la clave `"opencode"`.

4. **`opencode.ts` — `listModelAssignments`** — revertir aplicación de `canonicalProviderId` al campo `provider`. Write-back sigue usando `"opencode"` directamente.

5. **UI: `ModelPicker` / selector de provider + badge de suscripción** — la lógica de marcador verde cambia de `connectedProviders.has(provider.id)` a `connectedProviders.has("opencode-zen") && provider.id === "opencode"` para el caso OpenCode. El label visible usa `PROVIDER_DISPLAY_NAMES[provider.id] ?? provider.id`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/providerIdentity.ts` | Modified/Removed | Revertir `canonicalProviderId`; simplificar a alias display-only |
| `src/services/modelCatalogService.ts` | Modified | Revertir canonicalización en ingesta; eliminar migración on-read |
| `src/adapters/opencode.ts` | Modified | Revertir normalización en `listModelAssignments` |
| `src/components/molecules/ModelPicker/modelPicker.tsx` | Modified | Alias auth → marcador verde; label display-only |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tests con fixture `providerID: "opencode-zen"` fallan tras revertir | Medium | Restaurar fixtures a `"opencode"` y actualizar snapshots |
| Marcador verde no aparece si `connectedProviders` emite clave distinta | Low | Validar con `opencode providers list` en entorno real antes de spec |
| Coexistencia de `"opencode"` y `"opencode-zen"` en cache transitorio | Low | Sin migración on-read; el cache se regenera en el próximo sync |

## Rollback Plan

Los cuatro puntos modificados son cambios de revert sobre código existente. Revertir este commit
restaura el estado de `opencode-zen-catalog-identity`. No se escribe ningún dato nuevo a disco.

## Dependencies

- Verificar output de `opencode providers list` en entorno real para confirmar que emite `"opencode-zen"` y no otra variante antes de escribir specs.

## Success Criteria

- [ ] `GET /api/models` devuelve `catalog` con clave `"opencode"` (no `"opencode-zen"`)
- [ ] Con suscripción Zen activa: selector muestra `"OpenCode Zen"` + marcador verde
- [ ] Sin suscripción Zen: selector muestra `"OpenCode"` sin marcador
- [ ] `PUT /api/config` escribe `opencode/<model>` en opencode.json sin reverse-map adicional
- [ ] Perfiles existentes asignan correctamente con clave `"opencode"` sin HTTP 400
- [ ] Suite de tests pasa sin regresiones (`npm test` exit 0)
