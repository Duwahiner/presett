# Tasks: Profile Write Canonical Catalog

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 80-100 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | exception-ok |
| Chain strategy | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: N/A
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Single PR for all routes & tests | PR 1 | `npm test src/app/api/profiles` | `npm test` | Revert to `readModelCacheSafe` |

## Phase 1: Infrastructure (Helpers)

- [x] 1.1 Add `gentleAiDir()` helper to `src/app/api/profiles/route.ts`
- [x] 1.2 Add `gentleAiDir()` helper to `src/app/api/profiles/[name]/route.ts`
- [x] 1.3 Add `gentleAiDir()` helper to `src/app/api/profiles/base/route.ts`

## Phase 2: Core Implementation (Route Logic)

- [x] 2.1 Replace `readModelCacheSafe` with `loadMergedModelCatalogSafe` in `src/app/api/profiles/route.ts` (POST)
- [x] 2.2 Replace `readModelCacheSafe` with `loadMergedModelCatalogSafe` in `src/app/api/profiles/[name]/route.ts` (PUT)
- [x] 2.3 Replace `readModelCacheSafe` with `loadMergedModelCatalogSafe` in `src/app/api/profiles/base/route.ts` (PUT)

## Phase 3: Testing (Verification)

- [x] 3.1 Update `src/app/api/profiles/__tests__/route.test.ts` to mock `loadMergedModelCatalogSafe` and use `opencode-zen` fixture
- [x] 3.2 Update `src/app/api/profiles/[name]/__tests__/route.test.ts` to mock `loadMergedModelCatalogSafe` and use `opencode-zen` fixture
- [x] 3.3 Update `src/app/api/profiles/base/__tests__/route.test.ts` to mock `loadMergedModelCatalogSafe` and use `opencode-zen` fixture
- [x] 3.4 Run `npm test src/app/api/profiles` to verify all scenarios

## Phase 4: Cleanup

- [x] 4.1 Verify `npm run build` or `tsc --noEmit` passes
