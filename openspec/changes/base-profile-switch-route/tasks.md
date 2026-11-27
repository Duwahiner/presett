# Tasks: Base Profile Switch Route

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 60-80 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: N/A
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Add `/base` alias to service and API handler | PR 1 | `npm test src/services src/app/api` | API/Service test suite | Delete new route/revert service change |

## Phase 1: Service Layer Update

- [x] 1.1 Update `src/services/profilesApiService.ts` to use `"base"` segment when name is empty string.
- [x] 1.2 Update `src/services/__tests__/profilesApiService.test.ts` to assert `switchProfile("")` calls `/profiles/base/switch`.

## Phase 2: Core API Implementation

- [x] 2.1 Create `src/app/api/profiles/base/switch/route.ts` as a structural copy of `[name]/switch/route.ts` without params.
- [x] 2.2 Implement `POST` handler in `src/app/api/profiles/base/switch/route.ts` delegating to `switchProfile` with `name = ""`.

## Phase 3: Testing & Verification

- [x] 3.1 Create `src/app/api/profiles/base/switch/__tests__/route.test.ts` to verify success (200) and access control (403).
- [x] 3.2 Verify regression: Ensure existing profiles continue to work via existing `[name]/switch` route.
