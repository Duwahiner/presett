# Proposal: Visual Parity Remediation

## Intent

Migrated v2 screens are behaviorally correct but visually divergent from the official v2 design guide, PDF, and support screenshots. Shared shadcn primitives (`Button`, `Card`, `ConfirmDialog`) still emit rounded corners and soft shadows, causing systemic divergence across every scoped surface. Users and stakeholders see inconsistent information hierarchy, non-mono labels, and mixed surface treatments that undermine the v2 brand contract. This change corrects those divergences without touching routes, data contracts, or functional workflows.

## Scope

### In Scope
- Normalize shared primitives: `Button`, `Card`, `ConfirmDialog` → square corners, 2px hard border, hard shadow
- Scoped hierarchy + surface audit for: Dashboard, Models, SDD Profiles, Backups, Settings, notifications panel/items, Create Profile modal, restore toast
- Remove residual explicit `rounded-*` / `shadow-*` utility overrides from each scoped view
- Align mono technical labels, compact spacing, and visual hierarchy to evidence-backed v2 reference (design-system-v2.md, PDF, screenshots in `C:\DEV_PERSON\SCREENSHOT\s-preset\img-v2\`)
- All existing tests must pass without modification

### Out of Scope
- Agents, Permissions, Sync Activity (deferred to issues #89–#91)
- New routes, new data fetching, speculative data fields
- Functional regressions of any kind (restore immediacy, delete confirmation, notification dismiss)
- Accessibility attribute changes beyond what is required by visual restructuring

## Capabilities

> Contract between proposal and specs phases.

### New Capabilities
None

### Modified Capabilities
- `design-tokens`: hard-border / hard-shadow base values must propagate without being overridden by primitive defaults
- `layout-shell`: verify header/sidebar dimensions hold after primitive changes; notification popover visual contract
- `dashboard-page`: information hierarchy, Card/Button square treatment
- `models-page`: profile selector, select popup/items, empty state surfaces
- `profiles-page`: listing hierarchy, mono labels; CreateProfileModal typography and controls
- `backups-page`: restore toast and delete-confirmation visual consistency; shared control alignment
- `notification-panel`: panel surface, item row, dismiss control typography
- `badge-primitive`: confirm square/hard-border alignment if referenced in notifications
- `global-config-page`: settings route surface and control treatment
- `delete-backup-modal`: ConfirmDialog surface after shared primitive normalization

## Approach

**Bounded shared-primitive + scoped-class remediation** (recommended from exploration):

1. Normalize `Button`, `Card`, `ConfirmDialog` defaults to v2 square, hard-border, hard-shadow contract — fixes systemic divergence at the source
2. Audit and strip residual `rounded-*` / `shadow-*` class overrides in each scoped view (6 surfaces + shell)
3. Align information hierarchy, mono label typography, and compact spacing per evidence-backed references
4. Run full test suite after each primitive change before moving to scoped views

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/ui/button.tsx` | Modified | Remove `rounded-lg`; apply square v2 defaults |
| `src/components/ui/card.tsx` | Modified | Remove `rounded-xl`, soft shadow; apply 2px hard border + hard shadow |
| `src/components/ui/confirm-dialog.tsx` | Modified | Square surface, 2px border, hard shadow |
| `src/components/organisms/DashboardLayout/DashboardLayout.view.tsx` | Modified | Shell search/clear/mobile chrome radius, notification popover |
| `src/components/organisms/Dashboard/Dashboard.view.tsx` | Modified | Hierarchy and shared control usage |
| `src/components/organisms/ModelsClient/ModelsClient.view.tsx` | Modified | Select popup, loading/empty state, rounded overrides |
| `src/components/organisms/ProfilesClient/ProfilesClient.view.tsx` | Modified | Listing hierarchy, mono labels |
| `src/components/organisms/ProfilesClient/CreateProfileModal.tsx` | Modified | Modal typography and control squareness |
| `src/components/organisms/BackupsClient/BackupsClient.view.tsx` | Modified | Restore toast, delete flow, shared control consistency |
| `src/components/notifications/NotificationPanel.tsx` | Modified | Panel surface square treatment |
| `src/components/notifications/NotificationItem.tsx` | Modified | Item row typography, dismiss control |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Shared primitive changes break non-scoped consumers or snapshots | Med | Audit callers before edit; run full suite after each primitive |
| Token-only changes insufficient (hard-coded utilities override tokens) | High | Fix both: normalize primitive defaults AND strip residual utility overrides |
| Visual hierarchy edits accidentally remove controls or alter interaction semantics | Low | Preserve all props, handlers, and accessible labels; review diffs carefully |
| PDF/screenshots encode details not in canonical specs | Low | Remediation bounded to observed, evidence-backed divergences only |

## Rollback Plan

All changes are CSS-class and style-level only. Revert via `git revert` of the primitive normalization commits followed by scoped-view commits. No schema, route, or API changes exist — rollback carries zero data risk. CI must pass on the reverted branch before merging a rollback.

## Dependencies

- `docs/design-system-v2.md` — authoritative token and visual contract reference
- Official v2 PDF — layout/spacing evidence
- Support screenshots in `C:\DEV_PERSON\SCREENSHOT\s-preset\img-v2\` — per-screen visual evidence
- Canonical OpenSpec specs (all 11 existing specs) — behavioral preservation authority
- Prior exploration artifact `openspec/changes/visual-parity-remediation/exploration.md`

## Success Criteria

- [ ] `Button`, `Card`, `ConfirmDialog` emit square corners, 2px hard border, hard shadow with no `rounded-*` defaults
- [ ] No residual `rounded-*` or soft `shadow-*` utilities in Dashboard, Models, Profiles, Backups, Settings, shell, notifications, Create Profile modal, or restore toast
- [ ] Information hierarchy and mono labels match v2 references across all in-scope surfaces
- [ ] All existing Vitest tests pass without modification
- [ ] Agents, Permissions, and Sync Activity screens are unchanged
- [ ] Restore immediacy, delete confirmation behavior, and notification dismiss behavior are functionally identical
