# Design: Profile Creation and Deletion Safety

## Technical Approach

Cuatro correcciones quirúrgicas sobre código real. Ningún contrato público cambia.
El orden de capas es: adaptador → ruta → UI. Cada capa tiene su propio guard independiente.

## Architecture Decisions

| Decisión | Opción elegida | Alternativa rechazada | Razón |
|---|---|---|---|
| Guard reservado en adaptador | `RESERVED_PROFILE_NAMES.has(name)` al inicio de `deleteProfile` | Solo guardar en la ruta | Defensa en profundidad; el adaptador es la última frontera antes del filesystem |
| Fallback `default_agent` | Condicional inline antes de `writeOpenCodeConfig`, misma transacción | Segunda escritura post-delete | `writeOpenCodeConfig` es atómico (write→rename); una sola llamada garantiza atomicidad |
| Fallback sólo para activo | `config.default_agent === \`sdd-orchestrator-\${name}\`` | Restaurar siempre | La spec exige restaurar únicamente cuando el perfil eliminado era el activo |
| Orquestador fuera de acordeón | Eliminar `SectionBlock` para la entrada `orchestrator` de `SECTION_CONFIG`; renderizar `PhaseRow` directamente en un `<div>` con encabezado propio | Mantener `SectionBlock` con `alwaysExpanded: true` | `SectionBlock` siempre renderiza el botón de toggle; aunque `expanded=true`, el orquestador compite visualmente con el chevron y el label |
| Variante siempre visible | Renderizar el `<div>` de variante incondicionalmente; agregar `disabled={variants.length === 0}` al `Select.Root` | Condicional `{variants.length > 0 && ...}` actual | El condicional rompe la grilla 3-col cuando no hay variantes |
| Botón Delete en Base | `profile.name === ""` → no renderizar `onDeleteStart` / ocultar botón | Guard solo en API | La UI (Base tiene `name === ""`) es la primera barrera UX; la API es la barrera de seguridad |

## Data Flow

### Delete con guard reservado + restauración atómica

```
UI onDeleteStart(name)          [guard: name !== ""]
  → DELETE /api/profiles/{name}
      → route.ts DELETE handler
          guard: name === "base" || RESERVED_PROFILE_NAMES_HTTP.has(name) → 400
          → deleteProfile(configDir, name, backupDir)   [adapter]
              guard: !name || RESERVED_PROFILE_NAMES.has(name) → SCHEMA_INVALID
              readOpenCodeConfigSafe(configDir)          [lee .jsonc primero, fallback .json]
              elimina agentes del perfil del config.agent
              if config.default_agent === `sdd-orchestrator-${name}`
                  config.default_agent = "gentle-orchestrator"   ← misma mutación
              writeOpenCodeConfig(configDir, config, backupDir)
                  backup → writeFile(tmp) → rename(tmp, target)  ← atómico
              → ok(undefined)
          → 200 { ok: true }
  → refresh()
```

### Variante siempre visible en PhaseRow

```
PhaseRow(phase, assignment, catalog)
  providers = Object.keys(catalog)
  models = Object.keys(catalog[provider] ?? {})
  variants = catalog[provider]?.[model] ?? []   ← puede ser []

  render:
    <grid 3-col>
      Provider Select   (siempre)
      Model Select      (siempre, disabled si !provider)
      Variant Select    (siempre)
        Select.Root disabled={variants.length === 0 || !assignment.model}
        placeholder visible aunque no haya variantes
    </grid>
```

### Orquestador plano en CreateProfilePanel

```
SECTION_CONFIG.map(section):
  if section.key === "orchestrator":
    render <OrchestratorBlock>    ← nuevo bloque flat, sin SectionBlock
      label h4 "ORCHESTRATOR"
      PhaseRow phase="orchestrator"
  else:
    render <SectionBlock ...>     ← acordeón colapsable existente
      PhaseRow[] for section.phases
```

## File Changes

| Archivo | Acción | Descripción |
|---|---|---|
| `src/adapters/opencode.ts` | Modificar | `deleteProfile`: guard `RESERVED_PROFILE_NAMES.has(name)` + restauración atómica `default_agent` |
| `src/app/api/profiles/[name]/route.ts` | Modificar | `DELETE`: guard temprano `name === "base"` → 400 antes de llamar al adaptador |
| `src/components/organisms/ProfilesClient/createProfilePanel.tsx` | Modificar | Orquestador fuera de `SectionBlock`; variante siempre renderizada con `disabled` cuando sin variantes |
| `src/components/organisms/ProfilesClient/profilesClientView.tsx` | Modificar | Botón Delete oculto cuando `profile.name === ""` (perfil Base) |

**Sin archivos nuevos.** Todos los contratos públicos (`ProfilesClientViewProps`, `deleteProfile`, `writeOpenCodeConfig`) permanecen inalterados.

## Interfaces / Contracts

```typescript
// src/adapters/opencode.ts — deleteProfile (sin cambio de firma)
export async function deleteProfile(
  configDir: string,
  name: string,        // "" → SCHEMA_INVALID | "base" → SCHEMA_INVALID | válido → ok
  backupDir: string,
): Promise<Result<void>>

// Constante ya existente — solo se usa donde faltaba:
const RESERVED_PROFILE_NAMES = new Set(["base"]);   // line 238 opencode.ts

// Ruta DELETE — guard añadido (antes de invocar deleteProfile):
// if (name === "base" || RESERVED_PROFILE_NAMES_HTTP.has(name)) → 400

// PhaseRow — sin cambio de firma; comportamiento interno cambia:
// variants.length === 0 → Variant Select visible + disabled (no desaparece)

// SECTION_CONFIG — sigue siendo ReadonlyArray<...>
// orchestrator entry: copyable: false, alwaysExpanded: true  ← estos valores ya existen, solo se desvincula de SectionBlock
```

## Testing Strategy

| Capa | Qué probar | Enfoque |
|---|---|---|
| Adaptador RED | `deleteProfile(dir, "base", bk)` → `SCHEMA_INVALID`, sin writes | Vitest + tmpdir, spy `writeOpenCodeConfig` |
| Adaptador RED | `deleteProfile` activo → `default_agent` restaurado a `"gentle-orchestrator"` en una sola escritura | Leer el archivo tras la llamada |
| Adaptador RED | `deleteProfile` inactivo → `default_agent` sin cambios | Comparar `default_agent` antes/después |
| Ruta RED | `DELETE /api/profiles/base` → 400 sin invocar adaptador | MSW o spy sobre `deleteProfile` |
| UI RED `createProfilePanel` | `PhaseRow` sin variantes: `data-testid="variant-select"` presente y `aria-disabled` | RTL + catalog sin variantes |
| UI RED `createProfilePanel` | Sección orquestador sin `role="button"` de acordeón | RTL, `queryByRole('button', {name: /orchestrator/i})` ausente |
| UI RED `profilesClientView` | Tarjeta Base: botón Delete ausente | RTL, `profile.name === ""` |
| UI GREEN | `PhaseRow` con variantes: select habilitado | RTL |
| UI GREEN | `deleteProfile` perfil no-Base: flujo completo | RTL + MSW |

## Threat Matrix

N/A — no hay cambios de routing, shell, subprocess, VCS/PR automation, clasificación de ejecutables ni integración de procesos.

## Migration / Rollout

No se requiere migración. El archivo `opencode.json`/`opencode.jsonc` no cambia de esquema; `deleteProfile` solo añade un guard al inicio. Si `default_agent` apuntaba a un agente huérfano antes de este cambio, no se corrige retroactivamente (fuera de scope).

## Open Questions

- Ninguna. El diseño es completo y ejecutable sobre el código actual.
