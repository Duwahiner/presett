## Exploration: visual-parity-remediation

### Current State
The migrated routes already preserve the core product workflows and the canonical OpenSpec deltas define the intended v2 behavior for `/`, `/models`, `/profiles`, `/backups`, `/settings`, the Create Profile modal, restore feedback, and the notification panel. The current implementation is partially aligned: v2 tokens, 72px header, 260px sidebar, hard shadows in some views, immediate restore, and the settings route are present. However, shared shadcn primitives still emit rounded controls/cards (`Button`, `Card`, `ConfirmDialog`), and several page-level views retain rounded containers, soft shadows, non-mono labels, or information hierarchy that diverges from the guide/PDF/screenshots. The canonical specs explicitly keep navigation limited to the migrated routes; Agents, Permissions, and Sync Activity are excluded future issues #89–#91.

### Affected Areas
- `src/app/globals.css` — v2 token foundation is present, but does not by itself override hard-coded rounded/shadow utilities.
- `src/components/ui/button.tsx` — shared button defaults use `rounded-lg` and rounded size variants, affecting every scoped screen.
- `src/components/ui/card.tsx` — shared cards use `rounded-xl`, 1px border, and soft `shadow` instead of the 2px square hard-shadow contract.
- `src/components/ui/confirm-dialog.tsx` — delete/reset modal surface still uses `rounded-xl`, 1px border, and soft shadow.
- `src/components/organisms/DashboardLayout/DashboardLayout.view.tsx` — shell dimensions are aligned, but search/clear/mobile chrome retain explicit radius classes and the notification popover contract needs visual verification.
- `src/components/organisms/Dashboard/Dashboard.view.tsx` — dashboard hierarchy and shared Card/Button usage remain the highest-leverage page-level parity targets.
- `src/components/organisms/ModelsClient/ModelsClient.view.tsx` — profile selector, select popup/items, loading/empty states contain explicit rounded classes and soft shadows.
- `src/components/organisms/ProfilesClient/ProfilesClient.view.tsx` and `CreateProfileModal.tsx` — profile listing/modal structure is behaviorally covered, but page hierarchy and modal typography/controls need square brutalist treatment.
- `src/components/organisms/BackupsClient/BackupsClient.view.tsx` — most hard-border treatment exists; remaining shared controls and the restore/delete visual flow need consistency without changing immediate restore or separate delete confirmation.
- `src/components/notifications/NotificationPanel.tsx` and `NotificationItem.tsx` — panel is structurally a popover, while item dismiss control and typography still contain rounded/default styling.
- `openspec/specs/*.spec.md` — canonical requirements establish behavior-preservation and the explicit migrated-only scope; archived `design-system-v2` exploration records the audit evidence and owner correction.

### Approaches
1. **Bounded shared-primitive and scoped-class remediation** — normalize Button/Card/ConfirmDialog defaults to square, hard-border/hard-shadow v2 contracts, then remove only the remaining explicit rounded/soft-shadow classes in the six scoped surfaces and verify the existing tests.
   - Pros: smallest blast radius; fixes systemic divergence once; preserves APIs, state flows, accessibility, and current tests; naturally excludes future routes.
   - Cons: shared primitive changes can affect unscoped components; explicit page classes still require an audit to avoid residual divergence.
   - Effort: Medium

2. **Page-by-page visual rebuild** — recreate each migrated view against the screenshots while leaving shared primitives mostly unchanged.
   - Pros: permits detailed screenshot-specific composition changes.
   - Cons: larger regression surface, duplicated styling, continued primitive inconsistency, and unnecessary risk to information-bearing workflows.
   - Effort: High

### Recommendation
Choose bounded shared-primitive and scoped-class remediation. Treat this as a visual-only correction, not a new information-architecture migration: keep routes, data contracts, restore immediacy/toast, delete modal, notifications behavior, and all existing tests unchanged. First correct the shared radius/border/shadow defaults, then make a focused pass over the scoped page views and shell to align hierarchy, mono technical labels, square surfaces, and compact spacing. Do not touch Agents, Permissions, or Sync Activity, and do not introduce new routes or speculative data.

### Risks
- Changing shared Button/Card defaults may alter snapshots or legitimate non-scoped consumers; run the full test suite and inspect callers before broad class changes.
- Hard-coded `rounded-*` and `shadow-*` utilities override tokens, so token-only changes cannot establish parity.
- Visual hierarchy changes can accidentally remove controls or alter interaction semantics; preserve component props, handlers, and accessible labels.
- The PDF/screenshots may encode spacing details not represented in canonical specs; keep remediation bounded to observed, evidence-backed divergences.
- Existing canonical specs and archived audit are the authority for behavior/scope; do not revive archived requirements for excluded routes.

### Ready for Proposal
Yes — propose a bounded visual-parity remediation change covering only the migrated routes and named flows, with shared primitive normalization plus an explicit residual-radius/shadow and hierarchy audit. Acceptance should require no functional regressions and should explicitly exclude Agents, Permissions, and Sync Activity (#89–#91).
