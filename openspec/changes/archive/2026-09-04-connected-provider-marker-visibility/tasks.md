# Tasks: Connected Provider Marker Visibility

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~50 |
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
| 1 | Canonical Mapping Fix | PR 1 | `npm test src/services/__tests__/providerAuthService.test.ts` | Unit tests | `src/services/providerAuthService.ts` |
| 2 | Trigger UI Markers | PR 1 | `npm test src/components/molecules/ModelPicker/__tests__/` | Integration tests | `src/components/molecules/ModelPicker/modelPicker.tsx` |

## Phase 1: Canonical Mapping Fix
- [x] 1.1 Update `src/services/providerAuthService.ts` line 94: `"opencode zen": "opencode-zen"`
- [x] 1.2 Update `src/services/__tests__/providerAuthService.test.ts` to assert normalization to `"opencode-zen"`

## Phase 2: UI Implementation
- [x] 2.1 Modify `src/components/molecules/ModelPicker/modelPicker.tsx`: Wrap `Select.Value` in `span` and conditionally render `<span class="bg-success" ... />` when connected
- [x] 2.2 Modify `src/components/organisms/ProfilesClient/profilesClientView.tsx`: Wrap `Select.Value` in `span` and conditionally render marker for `OrchestratorPicker`

## Phase 3: Verification
- [x] 3.1 Write integration tests in `modelPicker.test.tsx`: Assert marker presence when connected and selector closed
- [x] 3.2 Write integration tests in `profilesClientView.test.tsx`: Assert marker presence for `OrchestratorPicker`
- [x] 3.3 Verify regression: Assert no marker when not connected
