# Proposal: Profile Creation and Deletion Safety

## Intent

Cuatro invariantes de seguridad incumplidas: (1) el orquestador vive dentro de un acordeón aunque `alwaysExpanded: true`, perdiendo protagonismo visual; (2) el selector de variante desaparece si el modelo no tiene variantes, rompiéndose la grilla 3-col; (3) `deleteProfile` en el adaptador solo guarda con `!name` (cadena vacía) pero no con el literal `"base"`, que puede llegar como segmento URL y eliminar el perfil reservado; (4) al eliminar el perfil activo, `default_agent` queda apuntando a un agente huérfano en lugar de restaurarse a `gentle-orchestrator`.

## Scope

### In Scope
- Sacar el selector de orquestador del acordeón: renderizarlo como sección flat visible siempre
- Variante siempre presente en `PhaseRow`: visible pero deshabilitada/placeholder cuando `variants.length === 0`
- Blindar `deleteProfile` en adaptador contra el literal `"base"` (y cualquier `RESERVED_PROFILE_NAMES`) además de cadena vacía
- Blindar la ruta `DELETE /api/profiles/[name]`: rechazar `name === "base"` con 400 antes de invocar el adaptador
- Restaurar `default_agent` a `"gentle-orchestrator"` atómicamente cuando el perfil eliminado es el activo (mismo `writeOpenCodeConfig`, misma transacción)
- Ocultar/deshabilitar el botón Delete en la UI para el perfil Base

### Out of Scope
- Crear una ruta estática `DELETE /api/profiles/base` (el 405 es aceptable como segunda barrera)
- Cambiar el flujo de creación de perfil o las secciones planning/design/closure
- Multi-tenancy o eliminación por lote

## Capabilities

### New Capabilities
- `profile-deletion-safety`: invariantes de indestructibilidad de Base y restauración atómica de `default_agent`

### Modified Capabilities
- `profiles-page`: botón Delete oculto/deshabilitado para Base; variante siempre visible; orquestador fuera de acordeón

## Approach

**Adaptador** (`src/adapters/opencode.ts`):
- `deleteProfile`: añadir guard `if (!name || RESERVED_PROFILE_NAMES.has(name))` → `SCHEMA_INVALID`
- `deleteProfile`: leer `config.default_agent` antes de borrar; si coincide con `sdd-orchestrator-{name}`, escribir `config.default_agent = "gentle-orchestrator"` en el mismo objeto antes de `writeOpenCodeConfig`

**Ruta API** (`src/app/api/profiles/[name]/route.ts`):
- `DELETE`: añadir guard temprano `if (name === "base" || RESERVED_PROFILE_NAMES_HTTP.has(name))` → 400

**UI** (`createProfilePanel.tsx`):
- `SECTION_CONFIG` orquestador: eliminar el `SectionBlock` wrapper; renderizar `PhaseRow` directamente bajo un `<div>` siempre visible
- `PhaseRow`: renderizar el `<div>` de variante siempre; aplicar `disabled` cuando `variants.length === 0`

**UI** (`profilesClientView.tsx` o `ProfileCard`):
- Ocultar/deshabilitar botón Delete cuando `profile.name === ""`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/adapters/opencode.ts` | Modified | Guard reservado + restauración atómica de `default_agent` |
| `src/app/api/profiles/[name]/route.ts` | Modified | Rechazo HTTP temprano para nombre reservado en DELETE |
| `src/components/organisms/ProfilesClient/createProfilePanel.tsx` | Modified | Orquestador flat + variante siempre visible |
| `src/components/organisms/ProfilesClient/profilesClientView.tsx` | Modified | Ocultar Delete en Base |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `writeOpenCodeConfig` falla a mitad de la restauración de `default_agent` | Low | Usa escritura atómica existente; si falla, el archivo original queda intacto (backup previo al write) |
| Cambio en `PhaseRow` rompe snapshot/test de variante | Low | Actualizar tests en el mismo PR; la grilla ya es 3-col, solo se elimina el condicional |
| Ruta `[name]` no recibe `"base"` porque Next.js resuelve la ruta estática primero | Low | La ruta estática `/base` no tiene DELETE, devuelve 405; el guard en `[name]` es defensa en profundidad para nombres similares futuros |

## Rollback Plan

Revertir el PR. El archivo `opencode.json`/`opencode.jsonc` no se muta en ningún flujo de UI de este change sin confirmación de usuario. El backup pre-write generado por `preWriteBackup` permite restaurar el estado anterior si el write atómico corrompe el archivo.

## Dependencies

- `preWriteBackup` (ya integrado en `writeOpenCodeConfig`) — sin dependencia externa nueva

## Success Criteria

- [ ] `deleteProfile(configDir, "base", backupDir)` devuelve `SCHEMA_INVALID` sin tocar el archivo
- [ ] `DELETE /api/profiles/base` devuelve 400 (desde el guard de la ruta) además del 405 de la ruta estática
- [ ] Eliminar el perfil activo restaura `default_agent = "gentle-orchestrator"` en la misma escritura
- [ ] El selector de orquestador es visible siempre sin acordeón colapsable
- [ ] El selector de variante aparece en todas las fases: habilitado con variantes, deshabilitado sin ellas
- [ ] El botón Delete no aparece / está deshabilitado para el perfil Base en la UI
