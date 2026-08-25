# Tasks: Design System v2 — Brutalist Control-Room Migration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 600-800 |
| 400-line budget risk | High |
| Chained PRs recommended | No (owner-approved size exception) |
| Suggested split | Single integrated PR |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Tokens & Shell | Integrated | `npm run test:tokens` | `DashboardLayout` | `globals.css` / `layout.tsx` |
| 2 | Pages & Routes | Integrated | `npm run test:pages` | `/settings` route | `/app` directory |
| 3 | Behavioral Fixes | Integrated | `npm run test:backups` | Backups page flow | `BackupsClient` |

## Phase 1: Infrastructure & Foundation

- [x] 1.1 Update `src/app/globals.css` with v2 tokens (colors, radius=0, hard shadows).
- [x] 1.2 Update `src/components/ui/badge.tsx` with unified v2 contract.
- [x] 1.3 Create `src/components/organisms/DeleteBackupModal/`.
- [x] 1.4 Refactor `src/app/layout.tsx` for 72px header/260px sidebar and uppercase wordmark.

## Phase 2: Core Shell Migration

- [x] 2.1 Refactor `DashboardLayout.view.tsx`: apply v2 sidebar groups and remove `/diagnostics` nav link.
- [x] 2.2 Migrate `NotificationPanel` to anchored `Radix Popover` with v2 header and item styles.
- [x] 2.3 Rename `/config` to `/settings` and add 307 redirect in `src/app/config/page.tsx`.

## Phase 3: Page Reskins

- [x] 3.1 RED: Create test for `/models` reskin.
- [x] 3.2 Implement `models-page` reskin matching reference screens.
- [x] 3.3 RED: Create test for `profiles-page` reskin & Create Profile modal.
- [x] 3.4 Implement `profiles-page` reskin and modal with inline validation.
- [x] 3.5 RED: Test for `backups-page` immediate restore and delete confirmation.
- [x] 3.6 Implement `backups-page` reskin + remove `restoreConfirmId` flow.
- [x] 3.7 Integrate `DeleteBackupModal` into `BackupsClient`.

## Phase 4: Testing & Verification

- [x] 4.1 Verify `GET /config` redirects to `/settings`.
- [x] 4.2 Verify `restoreBackup` calls API with `{ confirmed: true }` and shows toast.
- [x] 4.3 Verify `DeleteBackupModal` triggers destructive API call on DELETE.
- [x] 4.4 Audit and remove hardcoded `rounded-*` and `shadow-*` utility classes globally.
- [x] 4.5 Verify all routes pass visual inspection against V0 reference.

## Phase 5: Cleanup

- [x] 5.1 Finalize translations in `src/resources/`.
- [x] 5.2 Remove any dead imports from route rename.
- [x] 5.3 Verify no navigation links exist for deferred routes (#89, #90, #91).

## Phase 6: Bounded Remediation (verification blockers)

- [x] 6.1 Remove stale `restoreConfirmId`/`onRestoreConfirm`/`onRestoreCancel` references from `listing-integration.test.tsx`.
- [x] 6.2 Integrate `probeGentleAiVersion` into Dashboard via server-side data path and render Gentle-AI version card.
- [x] 6.3 Replace Profiles inline Create Profile form with accessible modal (single name field, `Name is required.`, CANCEL/SAVE PROFILE, close button).
- [x] 6.4 Update restore toast to render exact dynamic `✓ Restored {name}` while API invocation retains `{ confirmed: true }`.
- [x] 6.5 Remove `rounded-xl` from `NotificationItem` per zero-radius contract.
