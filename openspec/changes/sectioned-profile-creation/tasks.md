# Tasks: Sectioned Profile Creation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 200-300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Infrastructure & RED Tests | PR 1 | `npm test -- createProfilePanel.test.tsx` | N/A | Entire phase revertible |
| 2 | Implementation | PR 1 | `npm test` | `npm start` | Entire phase revertible |

## Phase 1: Preparation & RED Tests

- [x] 1.1 Update `createProfilePanel.test.tsx`: Modify `onSubmit` calls to remove obsolete second assignment argument (should cause test failure).
- [x] 1.2 Add `createProfilePanel.test.tsx` case: Verify "Copy to all" action triggers prop call with correct phase keys.

## Phase 2: Foundation & Infrastructure

- [x] 2.1 Add i18n keys for sections, phase titles, and copy actions in `src/resources/en.ts` and `src/resources/es.ts`.
- [x] 2.2 Extract `SectionBlock` component in `src/components/organisms/ProfilesClient/createProfilePanel.tsx`.
- [x] 2.3 Refactor `CreateProfilePanel` signature: Update interface to accept `newAssignments`, `onAssignmentChange`, `onCopyToSection`.

## Phase 3: Core Implementation

- [x] 3.1 Implement `handleCopyOrchestratorToSection(phases)` in `src/components/organisms/ProfilesClient/profilesClient.tsx`.
- [x] 3.2 Update `CreateProfilePanel` body: Replace single-orchestrator-input with section-mapped `SectionBlock` renders.
- [x] 3.3 Wire `profilesClientView.tsx` to forward new props (`newAssignments`, `onAssignmentChange`, `onCopyToSection`) to `CreateProfilePanel`.

## Phase 4: Testing & Verification

- [x] 4.1 Run `createProfilePanel.test.tsx` (GREEN: ensure all refactored tests pass).
- [x] 4.2 Verify manually: Check "Copy to all" action propagation and orchestrator-only creation (existing functionality).
- [x] 4.3 Verify variant visibility: Test model selection with and without variants.

## Phase 5: Remediation (post-verify FAIL)

- [x] 5.1 Fix i18n section label mismatch: add explicit `labelKey` mapping in `SECTION_CONFIG` for `design` → `profiles_section_design_execution` and `closure` → `profiles_section_closure_support`.
- [x] 5.2 `SectionBlock` renders `t(section.labelKey)` instead of concatenating `profiles_section_${section.key}`.
- [x] 5.3 Add regression test asserting the four section headers render human labels, never raw i18n keys.
- [x] 5.4 Focused test (`createProfilePanel.test.tsx`) 18 passed; ProfilesClient suite 77 passed; `npx tsc --noEmit` exit 0.
