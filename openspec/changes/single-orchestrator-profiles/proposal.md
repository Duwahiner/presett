# Proposal: Single Orchestrator Profiles

## Intent

Al crear un perfil, `handleCreate` envía hasta 11 agentes al adapter (`sdd-orchestrator-<name>` + 10 fases `sdd-<fase>-<name>`). El adapter los persiste todos en `opencode.json`, haciendo que opencode exponga todos como agentes seleccionables. El contrato correcto es: **un perfil = un único agente visible**, el orquestador. Los perfiles existentes con fases sobrantes deben migrarse atómicamente.

## Scope

### In Scope
- `handleCreate`: enviar solo `sdd-orchestrator-<name>` al adapter; descartar asignaciones de fases de la payload
- Adapter `createProfile`: aceptar solo la key de orquestador; rechazar keys `sdd-<fase>-<name>` sobrantes
- Endpoint `POST /api/profiles`: pasar solo el orquestador al adapter
- Migración atómica de perfiles existentes: backup → eliminar keys `sdd-<fase>-<name>` → conservar `sdd-orchestrator-<name>`, `orchestrator`, `model`, `default_agent`
- Script/ruta de migración ejecutable sin downtime

### Out of Scope
- Cambios en el formulario de creación sectioned (los campos de fase siguen en UI para configurar el orquestador por sección, pero no generan agentes extra)
- Modificar `deleteProfile` (ya limpia todos los agentes del perfil correctamente)
- Cambios en `updateProfile` ni en la edición de perfiles
- Perfiles Base: intocable

## Capabilities

### New Capabilities
- `profile-orchestrator-contract`: Invariante que un perfil persiste exclusivamente su agente orquestador; ninguna key `sdd-<fase>-<perfil>` se escribe durante creación

### Modified Capabilities
- `profiles-page`: La creación de perfiles ya no envía asignaciones de fases al adapter

## Approach

**Creación**: Filtrar en `handleCreate` antes del `createProfile()` call — solo pasar `sdd-orchestrator-<name>`. El adapter valida que ninguna key de asignación recibida sea `sdd-<fase>-*` no-orquestadora.

**Migración**: Función `migrateProfiles(configDir, backupDir)` — lee config, backup atómico, itera `agent`, elimina toda key que coincida con `sdd-<fase>-<perfil>` donde la fase no sea `orchestrator`, escribe con `writeOpenCodeConfig`. Se ejecuta como ruta API protegida `POST /api/profiles/migrate` o al inicio del servidor.

| Invariante | Dónde se impone |
|---|---|
| Solo `sdd-orchestrator-*` al crear | `handleCreate` (UI) + adapter `createProfile` (guard) |
| Perfiles existentes limpios | `migrateProfiles` en adapter |
| Base intocable | Guard existente `RESERVED_PROFILE_NAMES` |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/organisms/ProfilesClient/profilesClient.tsx` | Modified | `handleCreate`: filtrar assignments, solo orquestador |
| `src/adapters/opencode.ts` | Modified | `createProfile`: guard que rechaza keys no-orquestadoras; nueva `migrateProfiles` |
| `src/app/api/profiles/route.ts` | Modified | POST: pasar solo orquestador al adapter |
| `src/app/api/profiles/migrate/route.ts` | New | Endpoint de migración atómica |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Migración borra un agente que el usuario configuró manualmente con nombre `sdd-<fase>-*` | Low | Solo se limpian keys cuyo sufijo coincide con un perfil existente (`isProfileAgent` ya resuelve esto) |
| Backup falla antes de escribir | Low | `writeOpenCodeConfig` ya usa backup atómico; si falla no muta |
| Conflicto con `default_agent` apuntando a fase eliminada | Low | Guard existente en `deleteProfile`; migración replica la misma lógica de fallback a `gentle-orchestrator` |

## Rollback Plan

Backup creado por `writeOpenCodeConfig` antes de toda escritura. Restaurar el archivo de backup desde `backupDir` es suficiente para revertir. No hay cambios de esquema de DB.

## Dependencies

- `writeOpenCodeConfig` con backup atómico (ya existe)
- `isProfileAgent` helper (ya existe)

## Success Criteria

- [ ] Crear un perfil nuevo genera exactamente un agente en `opencode.json` (`sdd-orchestrator-<name>`)
- [ ] opencode no lista agentes `sdd-<fase>-<name>` para el perfil recién creado
- [ ] Migración elimina fases sobrantes de perfiles existentes conservando `sdd-orchestrator-*`, `orchestrator`, `model` y `default_agent`
- [ ] Base permanece intacta tras migración
- [ ] Tests del adapter y del cliente pasan sin regresión
