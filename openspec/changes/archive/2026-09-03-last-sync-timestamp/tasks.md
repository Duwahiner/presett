# Tasks: last-sync-timestamp

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 250-300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Infrastructure, Service, API, and UI | PR 1 | `npm test` | Dashboard local preview | Entire commit revert |

## Phase 1: Foundation (Infrastructure)

- [x] 1.1 Add `syncStatePath` to `src/lib/paths.ts`
- [x] 1.2 Create `src/services/syncStateService.ts` with atomic `writeSyncTimestamp` and read with validation
- [x] 1.3 Add `lastSyncAt?: string` to `DashboardStats` in `src/components/organisms/Dashboard/dashboardTypes.ts`

## Phase 2: Core Implementation (Logic & Wiring)

- [x] 2.1 Update `src/app/api/sync/route.ts` to call `writeSyncTimestamp` on success and handle warnings
- [x] 2.2 Update `src/app/page.tsx` to call `readSyncState` and fetch data for dashboard
- [x] 2.3 Update `src/components/organisms/Dashboard/dashboardView.tsx` to add `Última sincronización` Stat card

## Phase 3: Testing & Verification

- [x] 3.1 RED: Write `src/services/__tests__/syncStateService.test.ts` for file errors and atomic write failures
- [x] 3.2 GREEN: Implement `src/services/syncStateService.ts` to pass tests
- [x] 3.3 RED: Write `src/app/api/sync/__tests__/route.test.ts` for route success/fail scenarios
- [x] 3.4 GREEN: Implement `src/app/api/sync/route.ts` API logic
- [x] 3.5 Update `src/lib/visual-audit/fixtures.ts` to include `AUDIT_FIXTURE_LAST_SYNC`

## Phase 4: Cleanup & Polish

- [x] 4.1 Verify Dashboard `Nunca` fallback (file missing/invalid)
- [x] 4.2 Verify Dashboard does not reuse `lastBackup` timestamp
- [x] 4.3 Verify dashboard re-rendering after `POST /api/sync`
