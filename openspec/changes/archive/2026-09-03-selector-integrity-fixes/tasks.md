# Tasks: Selector Integrity Fixes

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250 |
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
| 1 | Infrastructure & Logic | PR 1 | `npm test lib/validators` | N/A (lib code) | Validator logic revert |
| 2 | UI Components | PR 1 | `npm test ModelPicker` | `npm start` | Component logic revert |
| 3 | E2E & Regressions | PR 1 | `npm test` | `npm start` | Full regression pass |

## Phase 1: Foundation (Logic & Types)

- [x] 1.1 Update `ModelAssignmentInput` in `src/lib/validators.ts` to make `variant` optional.
- [x] 1.2 Update `validateModelAssignment` in `src/lib/validators.ts` to allow missing `variant` when `variants.length === 0`.
- [x] 1.3 Add `normalizeName` helper in `src/components/organisms/ProfilesClient/createProfilePanel.tsx` (on submit logic).
- [x] 1.4 Update adapter `src/adapters/opencode.ts` to omit `variant` key from payload when empty string.

## Phase 2: UI Implementation (Sorting & Markers)

- [x] 2.1 Implement immutable sort (`[...arr].sort()`) for providers, models, and variants in `src/components/molecules/ModelPicker/modelPicker.tsx`.
- [x] 2.2 Implement immutable sort in `src/components/organisms/ProfilesClient/createProfilePanel.tsx` and `profilesClientView.tsx`.
- [x] 2.3 Guarantee `bg-success` marker visibility in `ModelPicker` and `OrchestratorPicker` (reuse existing pattern).
- [x] 2.4 Update `isValid` and `onConfirm` logic in `ModelPicker` to handle optional variant.

## Phase 3: Integration & Testing

- [x] 3.1 Verify marker visibility in `ModelPicker` test suite (mock `connectedProviders`).
- [x] 3.2 Verify validation logic in `validators.test.ts` (new schema cases).
- [x] 3.3 Verify name normalization in `createProfilePanel.test.tsx` (e.g., "MyName!" -> "myname").
- [x] 3.4 Verify adapter payload integrity in `adapters/__tests__/` (omit empty variant).
- [x] 3.5 Run full suite `npm test` to ensure 0 regressions.
