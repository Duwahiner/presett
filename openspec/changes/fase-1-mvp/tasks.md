# Tasks: PreSett Fase 1 MVP

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1700 across Slices 2-4 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Slice 1, base) → PR 2 (Slice 2) → PR 3 (Slice 3) → PR 4 (Slice 4) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Foundation: Next.js scaffold, types, read adapters, Dashboard | PR 1 | `npm test` | `npm run dev` + open http://localhost:3000 | Revert Slice 1 files |
| 2 | Models page, write path, validation, atomic write | PR 2 | `npm test -- src/lib src/adapters src/app/api` | `npm run dev` + change a model assignment | Revert Slice 2 files |
| 3 | Profiles create/edit/switch/delete | PR 3 | `npm test -- profiles` | `npm run dev` + create/switch/delete profile | Revert Slice 3 files |
| 4 | Backup viewer + sync wrapper | PR 4 | `npm test -- backups sync` | `npm run dev` + view backups and run sync | Revert Slice 4 files |

## Phase 1: Foundation (Slice 1) — DONE

- [x] 1.1 Scaffold Next.js 16 + TypeScript + Tailwind v4 + Vitest
- [x] 1.2 Create `src/types/` for agent, opencode, state, model cache
- [x] 1.3 Create `src/lib/adapters/opencode.ts` read path
- [x] 1.4 Create `src/lib/state.ts` and `src/lib/model-cache.ts` readers
- [x] 1.5 Create `src/app/api/health/route.ts`
- [x] 1.6 Create Dashboard layout and placeholder pages for Models, Profiles, Backups

## Phase 2: Models + Write Path (Slice 2)

- [x] 2.1 Create `src/lib/types.ts` with `Result<T, ConfigError>` and error codes
- [x] 2.2 Create `src/lib/paths.ts` with injectable baseDir resolvers
- [x] 2.3 Create `src/lib/validators.ts` with Zod schemas and model/variant validation
- [x] 2.4 Add `writeOpenCodeConfig`, `listModelAssignments`, and atomic-write helpers to `src/adapters/opencode.ts`
- [x] 2.5 Create `src/lib/preWriteBackup.ts` with PreSett-owned backup + retention
- [x] 2.6 Create `src/app/api/status/route.ts` (dashboard state)
- [x] 2.7 Create `src/app/api/models/route.ts` (model catalog)
- [x] 2.8 Create `src/app/api/config/route.ts` (GET assignments / PUT change)
- [x] 2.9 Create `ModelPicker`, `AgentAssignmentRow`, `ErrorBanner` components
- [x] 2.10 Implement `src/app/models/page.tsx` with read/write UI
- [x] 2.11 Write unit + integration tests for validators, adapter write path, and API routes

## Phase 3: Profiles (Slice 3)

- [x] 3.1 Add profile CRUD helpers to `src/adapters/opencode.ts`
- [x] 3.2 Create `src/app/api/profiles/route.ts` (GET list / POST create)
- [x] 3.3 Create `src/app/api/profiles/[name]/route.ts` (PUT edit / DELETE)
- [x] 3.4 Create `src/app/api/profiles/[name]/switch/route.ts` (POST activate)
- [x] 3.5 Create profile form and list components
- [x] 3.6 Implement `src/app/profiles/page.tsx`
- [x] 3.7 Write tests for profile validation, CRUD, and switch behavior

## Phase 4: Backups + Sync (Slice 4)

- [x] 4.1 Create `src/services/backupsService.ts` to read manifests and derive metadata
- [x] 4.2 Create `src/services/processService.ts` to spawn `gentle-ai sync`
- [x] 4.3 Create `src/app/api/backups/route.ts` (read-only list)
- [x] 4.4 Create `src/app/api/sync/route.ts` (POST wrapper)
- [x] 4.5 Create `BackupsClient` component
- [x] 4.6 Implement `src/app/backups/page.tsx`
- [x] 4.7 Write tests for backup manifest parsing and sync result handling

## Phase 5: Verification & Docs

- [ ] 5.1 Run full test suite and fix failures
- [ ] 5.2 Run build (`npm run build`) and fix errors
- [ ] 5.3 Update README with setup, security, and rollback instructions
