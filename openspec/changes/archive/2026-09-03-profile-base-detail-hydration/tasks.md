# Tasks: profile-base-detail-hydration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~450 lines |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (GET) → PR 2 (PUT) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | GET Infrastructure | PR 1 | `npm test route.test.ts` | `GET /api/profiles/base` | Delete `base/route.ts` |
| 2 | PUT Infrastructure | PR 2 | `npm test update.test.ts` | `PUT /api/profiles/base` | Revert `updateBaseProfile` |

> **Estado de la cadena (stacked-to-main)**: PR 1 = unidad GET/hidratación (implementada). PR 2 = unidad PUT (pendiente). Las tareas que mezclan GET+PUT están divididas en sub-tareas por PR.

## Phase 1: Infrastructure (GET & PUT)

- [x] 1.1 GET: create `src/app/api/profiles/base/route.ts` with `GET` (return Base) + `OPTIONS` preflight
- [x] 1.1 PUT: add `PUT` to `base/route.ts` (persist Base)
- [x] 1.2 GET: implement `getBaseProfileDetail` in `src/adapters/opencode.ts`
- [x] 1.2 PUT: implement `updateBaseProfile` in `src/adapters/opencode.ts`
- [x] 1.3 Add "base" to `createProfile` denylist in `src/adapters/opencode.ts`

## Phase 2: Core Logic Integration

- [x] 2.1 Update `src/services/profilesApiService.ts`: route `getProfileDetail("")` to `/api/profiles/base`
- [x] 2.2 Update `src/services/profilesApiService.ts`: route `updateProfile("", data)` to `/api/profiles/base`
- [x] 2.3 Base detail hydration reaches the client with `editAssignments` populated (URL resolution lives in the service per design decision "Alias location"; no client URL change required — `handleEditStart` already delegates to `getProfileDetail`)

## Phase 3: Testing & Verification

- [x] 3.1 GET: create `src/app/api/profiles/base/__tests__/route.test.ts` (GET contract tests)
- [x] 3.1 PUT: add PUT contract tests for `/api/profiles/base`
- [x] 3.2 Update `src/adapters/__tests__/profiles.test.ts` (Base detail + reserved-name guard tests)
- [x] 3.3 Update `src/services/__tests__/profilesApiService.test.ts` (empty-name alias test)
- [x] 3.4 Update `src/components/organisms/ProfilesClient/__tests__/profilesClient.test.tsx` (Base hydration integration)

## Phase 4: Verification & Docs

- [x] 4.1 Verify GET/PUT against specs (verify phase)
- [x] 4.2 Document "base" as reserved profile name