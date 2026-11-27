# Design: Single Orchestrator Profiles

## Technical Approach

Restringir el write path en tres capas: el adapter rechaza claves de fase y solo persiste `sdd-orchestrator-<name>`; el cliente elimina el loop `SDD_PHASES`; el UI elimina las secciones de fase del panel. Una función `migrateProfiles` limpia el estado legacy de forma atómica (backup → delete → write) y se dispara como no-op barato en `GET /api/profiles`.

## Architecture Decisions

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Filtrar en adapter vs. en API route | El adapter es la capa de escritura atómica; filtrar en route duplica responsabilidad | **Adapter** |
| Boot-time migration vs. endpoint dedicado | Boot garantiza estado limpio antes del primer render; endpoint requiere orchestration externa | **Lazy en `GET /api/profiles`**: no-op si ya está limpio |
| `getProfileDetail` filtra o devuelve todo | Filtrar en el adapter mantiene el contrato limpio para futuros editores | **Devuelve solo orchestratorKey** |
| Eliminar fases del UI vs. ocultar | Eliminar evita payload contaminado y simplifica estado | **Eliminar secciones planning/design/closure** |

## Data Flow

```
CREATE
CreateProfilePanel (solo orchestratorKey)
  → handleCreate: assignments = { "sdd-orchestrator-<name>": orchestratorAssignment }
  → POST /api/profiles
  → adapter.createProfile: escribe solo config.agent["sdd-orchestrator-<name>"]
  → writeOpenCodeConfig (atómico)

EDIT
handleEditStart → GET /api/profiles/<name>
  → adapter.getProfileDetail: devuelve { "sdd-orchestrator-<name>": assignment }
  → editAssignments tiene solo orchestratorKey
  → PUT /api/profiles/<name>
  → adapter.updateProfile: filtra, escribe solo orchestratorKey

MIGRATE (lazy, primer GET /api/profiles)
  → adapter.migrateProfiles: scan legacy sdd-<fase>-<name>
  → si hay legacy → backup atómico → delete fases → writeOpenCodeConfig
  → si limpio → no-op (cero I/O de escritura)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/adapters/opencode.ts` | Modify | `createProfile`: solo escribe `orchestratorKey`; `updateProfile`: filtra a `orchestratorKey`; `getProfileDetail`: devuelve solo orchestrator; nueva `migrateProfiles()` |
| `src/app/api/profiles/route.ts` | Modify | Handler `GET` llama `migrateProfiles` como preflight no-op antes de `listProfiles` |
| `src/components/organisms/ProfilesClient/profilesClient.tsx` | Modify | `handleCreate`: elimina loop `SDD_PHASES` y constante; elimina `handleCopyOrchestratorToSection` |
| `src/components/organisms/ProfilesClient/createProfilePanel.tsx` | Modify | Elimina `SECTION_CONFIG` entries `planning`, `design`, `closure`; conserva solo `orchestrator` |

## Interfaces / Contracts

```typescript
// src/adapters/opencode.ts — nueva función
export async function migrateProfiles(
  configDir: string,
  backupDir: string,
): Promise<Result<{ migratedProfiles: string[]; removedAgents: string[] }>>

// createProfile — invariante nueva
// BEFORE: itera assignments (cualquier clave)
// AFTER: solo escribe config.agent[`sdd-orchestrator-${name}`]
// Rechaza con SCHEMA_INVALID si la clave no es el orchestratorKey del perfil

// getProfileDetail — semántica nueva
// BEFORE: devuelve todos los agentKey cuyo profile === name (incluye fases)
// AFTER: devuelve solo { [orchestratorKey]: assignment } | null

// handleCreate — payload simplificado
const assignments = {
  [`sdd-orchestrator-${nameToCreate}`]:
    newAssignments["orchestrator"] ?? { provider: "", model: "", variant: "" },
};
// loop SDD_PHASES eliminado
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit adapter RED | `createProfile` rechaza clave `sdd-init-<name>` en assignments | Vitest — assert `SCHEMA_INVALID` |
| Unit adapter | `createProfile` escribe solo orchestratorKey aunque reciba fases | Vitest — spy `writeOpenCodeConfig`, assert config |
| Unit adapter | `migrateProfiles` elimina fases legacy, conserva orchestrator y `default_agent` | Vitest — config in-memory con fases |
| Unit adapter | `migrateProfiles` es no-op si config ya está limpio | Vitest — assert cero escrituras |
| Unit adapter | `getProfileDetail` devuelve solo orchestratorKey | Vitest |
| Unit UI | `handleCreate` construye payload solo con orchestratorKey | Vitest — spy `createProfile`, assert payload |
| Integration | `GET /api/profiles` migra legacy transparentemente | Vitest + supertest |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, o límite de integración de proceso.

## Migration / Rollout

`migrateProfiles` corre en el handler `GET /api/profiles` antes de `listProfiles`:

1. Lee config (solo lectura — `readOpenCodeConfigSafe`)
2. Escanea agentes: detecta cualquier `sdd-<fase>-<profile>` donde ese perfil tiene `sdd-orchestrator-<profile>`
3. Si hay legacy → backup previo → elimina claves de fase → `writeOpenCodeConfig` atómico
4. Si no hay → retorna `{ migratedProfiles: [], removedAgents: [] }` sin escrituras
5. `default_agent` y el agente `sdd-orchestrator-<name>` nunca se tocan

Base (`""`) y `default_agent` están protegidos por `isProfileAgent` que ya devuelve `null` para claves no-SDD.

## Open Questions

- [ ] ¿El log de migración (`migratedProfiles`, `removedAgents`) debe exponerse en la respuesta de `GET /api/profiles` o solo en consola server-side?
- [ ] ¿El panel de edición (`editAssignments` en `profilesClientView.tsx`) renderiza el modelo del orquestador directamente por clave o necesita un adaptador de clave → label?
