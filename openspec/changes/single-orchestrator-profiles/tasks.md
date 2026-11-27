# Tasks: Single Orchestrator Profiles

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 150-250 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Logic & Panel | PR 1 | `npm test -- --grep=orchestrator` | `npm run dev` (temp config) | Config changes/service logic |

## Phase 1: Adapter — single-orchestrator write & detail contract

- [x] 1.1 `createProfile` persiste solo `sdd-orchestrator-<name>` y rechaza claves de fase legacy con `SCHEMA_INVALID` sin escribir nada.
- [x] 1.2 `updateProfile` persiste solo el orchestrator y descarta claves de fase del payload.
- [x] 1.3 `getProfileDetail` devuelve únicamente la asignación del orquestador (sin fases legacy).

## Phase 2: Adapter — migración lazy atómica

- [x] 2.1 Nueva `migrateProfiles(configDir, backupDir)` que limpia fases legacy de perfiles nombrados con backup atómico, preservando orquestador, `default_agent`, Base y otros perfiles.
- [x] 2.2 `migrateProfiles` es no-op sin escrituras cuando el config ya está limpio; conserva claves de fase huérfanas sin orquestador.

## Phase 3: API — preflight de migración en GET

- [x] 3.1 `GET /api/profiles` ejecuta `migrateProfiles` como preflight no-op antes de `listProfiles`.

## Phase 4: UI — eliminar fases y copy

- [x] 4.1 `createProfilePanel` renderiza solo la sección Orchestrator; se eliminan planificación/design/closure y el botón "copy to section".
- [x] 4.2 `profilesClient` elimina el loop `SDD_PHASES` y `handleCopyOrchestratorToSection`; `handleCreate` envía solo el orquestador.
- [x] 4.3 `profilesClientView` y `profilesClientTypes` eliminan `onCopyToSection` y el loop de asignaciones de fase del editor.

## Phase 5: Verificación

- [x] 5.1 RED tests escritos primero y GREEN confirmado (Strict TDD) para adapter, migración, ruta GET y UI.
- [x] 5.2 Suite completa 732 tests passing; `tsc --noEmit` y `next build` sin errores.
- [x] 5.3 Runtime harness sobre config temporal: GET migra fases legacy, conserva orquestador/default/Base, crea backup, y es no-op idempotente.