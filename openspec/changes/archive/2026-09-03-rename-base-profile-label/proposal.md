# Proposal: Rename Base Profile Label

## Intent

El perfil interno Base (`name: ""`) se muestra hoy con la etiqueta `"Base"` codificada en `listProfiles` del adaptador OpenCode. Ese nombre no deja claro que se trata del orquestador raíz del sistema. Mostrar `"Gentle-Orchestrator"` elimina la ambigüedad sin alterar ninguna identidad interna, ruta, clave de agente ni archivo de configuración.

## Scope

### In Scope
- Cambiar el literal `"Base"` → `"Gentle-Orchestrator"` como `displayName` en `listProfiles` (`src/lib/opencode.ts`)
- Añadir/actualizar test unitario que afirme el nuevo `displayName` para el perfil con `name: ""`

### Out of Scope
- Cambiar la clave interna `name: ""`
- Modificar rutas de API (`/api/profiles/base`, `/api/profiles/`)
- Cambiar el identificador del agente `gentle-orchestrator`
- Renombrar archivos de configuración o de perfil en disco
- Añadir lógica de localización o i18n

## Capabilities

### New Capabilities
None

### Modified Capabilities
- `profiles-page`: El `displayName` del perfil Base ahora se muestra como `Gentle-Orchestrator` en la lista y en el editor.

## Approach

Cambio de una línea en `listProfiles` (`src/lib/opencode.ts`): donde se asigna `displayName` para el perfil con `name === ""`, sustituir el literal `"Base"` por `"Gentle-Orchestrator"`. El resto del flujo (UI, API, estado) ya consume `displayName` del adaptador sin redefinirlo.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/opencode.ts` — `listProfiles` | Modified | Literal `"Base"` → `"Gentle-Orchestrator"` |
| Test unitario de `listProfiles` | Modified | Afirmar nuevo `displayName` para `name: ""` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Test existente hardcodea `"Base"` | Low | Actualizar aserción en el mismo commit |
| Snapshot o fixture de UI con texto `"Base"` | Low | Buscar referencias en fixtures antes de aplicar |

## Rollback Plan

Revertir el cambio de una línea en `listProfiles`. No hay migración de datos ni cambio de contrato de API; el rollback es inmediato.

## Dependencies

Ninguna.

## Success Criteria

- [ ] La lista de perfiles muestra `Gentle-Orchestrator` para el perfil Base (`name: ""`)
- [ ] Ningún test existente falla por el cambio de etiqueta
- [ ] El test unitario de `listProfiles` afirma explícitamente `displayName === "Gentle-Orchestrator"` para `name: ""`
- [ ] No se altera ninguna ruta, clave de agente ni archivo de configuración
