# Tasks: Profile Creation and Deletion Safety

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 250-350 |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | exception-ok |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Logic & API Safety | PR 1 | `npm test -- profile-deletion` | Local API unit tests | `src/adapters/opencode.ts` changes |
| 2 | UI Safety | PR 1 | `npm test -- profiles-ui` | Storybook / Manual UI test | UI component changes |

## Phase 1: Core Logic & API Safety

- [x] 1.1 Create RED test: `test_delete_base_profile_fails` (expect schema error when deleting "base")
- [x] 1.2 Implement `RESERVED_PROFILE_NAMES` guard in `src/adapters/opencode.ts` (make 1.1 pass)
- [x] 1.3 Create RED test: `test_api_delete_base_returns_400`
- [x] 1.4 Implement HTTP guard in `src/app/api/profiles/[name]/route.ts` (make 1.3 pass)
- [x] 1.5 Create RED test: `test_delete_active_profile_resets_agent`
- [x] 1.6 Implement atomic restoration of `default_agent` in `deleteProfile` (make 1.5 pass)

## Phase 2: UI Implementation

- [x] 2.1 Flatten orquestador section in `createProfilePanel.tsx` (remove accordion)
- [x] 2.2 Force rendering of variant selector in `PhaseRow` (always visible, disabled if `variants.length === 0`)
- [x] 2.3 Add conditional logic in `profilesClientView.tsx` to hide/disable Delete button for "base"

## Phase 3: Testing & Verification

- [x] 3.1 Verify `DELETE /api/profiles/base` returns 400 (early rejection)
- [x] 3.2 Verify deleting active profile switches `default_agent` to `gentle-orchestrator`
- [x] 3.3 Verify "base" is indestructible in UI (button disabled/hidden)
- [x] 3.4 Verify variant selector grilla persistence (3-col stable)

## Phase 4: Cleanup & Docs

- [x] 4.1 Update UI component snapshot tests (if broken by UI changes)
- [x] 4.2 Validate `opencode.json` integrity after successful deletion
