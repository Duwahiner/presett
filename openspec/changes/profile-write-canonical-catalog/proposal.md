# Proposal: Profile Write Canonical Catalog

## Intent

Las rutas de escritura de perfiles (`POST /api/profiles`, `PUT /api/profiles/[name]`, `PUT /api/profiles/base`) validan asignaciones contra `readModelCacheSafe`, que devuelve el catálogo legacy `model-variants.json` con clave `opencode`. La UI usa `loadMergedModelCatalogSafe`, que aplica la migración on-read `opencode → opencode-zen`. El mismatch produce HTTP 400 al asignar cualquier modelo de OpenCode Zen, porque el catálogo que reciben los adaptadores no contiene la clave `opencode-zen`.

## Scope

### In Scope
- Reemplazar `readModelCacheSafe` por `loadMergedModelCatalogSafe` en los tres PUT/POST de perfiles
- Añadir `gentleAiDir()` helper en cada ruta afectada (igual que `config/route.ts` y `models/route.ts`)
- Mantener la firma de los adaptadores `createProfile`, `updateProfile`, `updateBaseProfile` sin cambios (reciben `ModelCache` — tipo idéntico)
- Actualizar mocks de tests para proveer catálogo canónico `opencode-zen`

### Out of Scope
- Modificar `opencode.json`, persistencia, o lógica de switch de perfil
- Cambiar `POST /api/profiles/[name]/switch` (no valida catálogo)
- Cambiar la migración on-read en `modelCatalogService.ts`
- Cambiar la firma o comportamiento de los adaptadores

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `profile-detail-endpoint`: las rutas PUT/POST de escritura de perfiles ahora validan contra el catálogo canónico merged en lugar del cache legacy

## Approach

Las rutas `profiles/route.ts`, `profiles/[name]/route.ts` y `profiles/base/route.ts` repiten el mismo patrón que ya usa `config/route.ts`:

1. Añadir `gentleAiDir()` helper local (alineado con `config/route.ts:39`)
2. Reemplazar `readModelCacheSafe(cacheDir())` por `loadMergedModelCatalogSafe({ cacheDir, openCodeConfigDir, gentleAiDir })`
3. El resultado `.value` es `ModelCache` — compatible directo con los adaptadores sin cambios adicionales

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/profiles/route.ts` | Modified | POST usa `loadMergedModelCatalogSafe` en lugar de `readModelCacheSafe` |
| `src/app/api/profiles/[name]/route.ts` | Modified | PUT usa `loadMergedModelCatalogSafe` en lugar de `readModelCacheSafe` |
| `src/app/api/profiles/base/route.ts` | Modified | PUT usa `loadMergedModelCatalogSafe` en lugar de `readModelCacheSafe` |
| `src/app/api/profiles/__tests__/route.test.ts` | Modified | Mocks actualizados a catálogo canónico `opencode-zen` |
| `src/app/api/profiles/[name]/__tests__/route.test.ts` | Modified | Mocks actualizados a catálogo canónico `opencode-zen` |
| `src/app/api/profiles/base/__tests__/route.test.ts` | Modified | Mocks actualizados a catálogo canónico `opencode-zen` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `loadMergedModelCatalogSafe` llama CLI en producción y puede ser más lenta | Low | Tiene caché en memoria con TTL; las rutas de escritura ya aceptan 503 si el catálogo no está |
| Tests rotos por cambio de import | Low | El tipo de retorno `ModelCache` es idéntico; solo cambia la función de carga |
| Regresión en tests que mockeaban `readModelCacheSafe` | Medium | Requiere actualizar los mocks para apuntar a `modelCatalogService` |

## Rollback Plan

Revertir las tres rutas a `readModelCacheSafe(cacheDir())` y restaurar los imports previos. Cambio de una línea por archivo; no afecta persistencia ni opencode.json.

## Dependencies

- `loadMergedModelCatalogSafe` ya exportada en `src/services/modelCatalogService.ts`
- Migración on-read `opencode → opencode-zen` ya implementada en ese mismo servicio

## Success Criteria

- [ ] `POST /api/profiles` con modelo `opencode-zen/<model>` devuelve HTTP 200
- [ ] `PUT /api/profiles/[name]` con modelo `opencode-zen/<model>` devuelve HTTP 200
- [ ] `PUT /api/profiles/base` con modelo `opencode-zen/<model>` devuelve HTTP 200
- [ ] Suite de tests completa sigue en verde (`npm test`)
- [ ] `tsc --noEmit` sin errores
- [ ] opencode.json y switch de perfil no se ven afectados
