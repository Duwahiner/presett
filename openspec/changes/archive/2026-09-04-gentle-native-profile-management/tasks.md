# Tasks: gentle-native-profile-management

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~450-550 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Strategy Detection & Guardrails | PR 1 | `npm test -- --grep "StrategyDetection"` | API integration tests | Guardrails layer |
| 2 | Delegation & Phase Assignment | PR 2 | `npm test -- --grep "SyncDelegation"` | `gentle-ai` mock CLI | Service layer |
| 3 | Repair & Backup | PR 3 | `npm test -- --grep "Repair"` | Backup utility | Atomic operation boundary |

## Phase 1: Foundation / Infrastructure

- [x] 1.1 Create `src/services/profileStrategyService.ts` to detect `generated-multi` vs `external-single-active` strategy.
- [x] 1.2 Implement `requireMutationOrigin` guardrail middleware in `src/middleware/auth.ts`.
- [x] 1.3 Update `src/types/profile.ts` to include `strategy` and `incomplete` fields.
- [x] 1.4 Update `src/services/listProfiles.ts` to populate strategy/incomplete status.

## Phase 2: Core Implementation (Delegation)

- [x] 2.1 Extend `src/services/processService.ts` (`runGentleAiSync`) to accept `args?: string[]` and execute `gentle-ai sync ...args`.
- [x] 2.2 Add `PUT /api/profiles/[name]/phases/[phase]` route (per design; task text said POST) to handle Gentle-AI profile phase assignments via `--profile-phase`.
- [x] 2.3 Add `GET /api/profiles/[name]` logic to use `StrategyService` for read-only enforcement on `external-single-active` (exposes `strategy` on read; reads stay permitted, writes blocked).
- [x] 2.4 (focused remediation) `createProfile`/`updateProfile` (orquestador) delegan a `gentle-ai sync --profile {name}:{provider}/{model}` en generated-multi; se eliminan las escrituras directas de `sdd-orchestrator-*`. Se conservan guardrails external/unknown (403 en ruta) y validaciones (regex nombre, nombre reservado `base`, catálogo de modelos, rechazo de phase keys legacy).
- [x] 2.5 (verify remediation) Sección per-fase en `ModelsClient`: renderiza las 10 fases SDD como filas editables vía `updateProfilePhase` solo para `generated-multi`; se oculta para `unknown`/`external-single-active` (read-only). Tests RTL cubren R1/S1 y R2/S2 de `profile-phase-assignment-ui` (más helpers puros `activeProfileName`/`phaseAgentKey`/`buildPhaseAssignments`).

## Phase 3: Repair & Verification

- [x] 3.1 Implement `BackupUtility` in `src/utils/backup.ts` for atomic filesystem backups.
- [x] 3.2 Add `POST /api/profiles/[name]/repair` route with conservative (e.g., 30s) configurable timeout and explicit confirmation logic.
- [x] 3.3 Add RED test: Attempt repair on `external-single-active` profile (expect 403).
- [x] 3.4 Add GREEN test: Verify repair on `incomplete` profile restores state after backup.
- [x] 3.5 Add RED test: Interrupt repair (expect backup restoration/integrity).

## Phase 4: Documentation

- [x] 4.1 Create `docs/opencode-profiles.md` documenting dual-mode behavior.
- [x] 4.2 Document `POST /api/profiles/[name]/repair` timeout and explicit confirmation requirement.
