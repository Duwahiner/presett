# Tasks: Visual Parity Remediation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 400-500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Primitives + Shell) → PR 2 (Models + Profiles) → PR 3 (Dashboard + Settings) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Primitive Normalization | PR 1 | `npm test` | Visual check of Buttons/Cards | Primitive files |
| 2 | Core Surface Remediation | PR 2 | `npm test` | Models + Profiles surfaces | Model/Profile files |
| 3 | Final Alignment | PR 3 | `npm test` | Dashboard + Config + Shell | Dashboard/Config files |

## Phase 1: Infrastructure / Primitives

- [x] 1.1 Modify `src/components/ui/button.tsx` (remove rounded classes)
- [x] 1.2 Modify `src/components/ui/card.tsx` (remove rounded, add hard border/shadow)
- [x] 1.3 Modify `src/components/ui/confirm-dialog.tsx` (square surface, update title typography)
- [x] 1.4 Verify Layer 1 tests pass

## Phase 2: Core Models & Profiles Implementation

- [x] 2.1 Remediate `src/components/organisms/ModelsClient/ModelsClient.view.tsx`
- [x] 2.2 Remediate `src/components/molecules/AgentAssignmentRow/AgentAssignmentRow.tsx`
- [x] 2.3 Remediate `src/components/organisms/ProfilesClient/ProfilesClient.view.tsx`
- [x] 2.4 Patch `src/components/atoms/Stat/Stat.tsx`
- [x] 2.5 Verify Layer 2 tests pass

## Phase 3: Dashboard, Settings & Shell Implementation

- [x] 3.1 Remediate `src/components/organisms/Dashboard/Dashboard.view.tsx`
- [x] 3.2 Remediate `src/components/organisms/GlobalConfigClient/GlobalConfigClient.tsx`
- [x] 3.3 Remediate `src/components/organisms/DashboardLayout/DashboardLayout.view.tsx` (Search)
- [x] 3.4 Remediate `src/components/notifications/NotificationItem.tsx`
- [x] 3.5 Verify Layer 3 tests pass

## Phase 4: Testing / Verification

- [x] 4.1 Visual Regression: Verify against `img-v2` screenshots
- [x] 4.2 Verify restored functionality (restore/delete/dismiss)
- [x] 4.3 Ensure accessibility remains intact (aria-labels/roles)
