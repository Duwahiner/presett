# Design: Visual Parity Remediation (Revised)

## Technical Approach

Three-layer remediation. **Layer 1** normalizes three shared primitives. **Layer 2** applies concrete, evidence-based structural and hierarchy fixes to each of the four divergent scoped views plus shell. **Layer 3** covers notification surface and shared sub-components. Every view change is bounded to JSX class edits and intra-component restructuring; all data contracts, routes, and prop signatures remain untouched. Some structural JSX changes exceed CSS-class swaps — behavioral tests should not require modification (they assert interactions and ARIA, not class names), but test output MUST be verified after each layer and any failure treated as a blocker.

## Architecture Decisions

| Decision | Choice | Alternative Rejected | Rationale |
|---|---|---|---|
| Layer ordering | Primitives → full test run → Models → Profiles → Dashboard/Stat → Settings → shell/notifications | Parallel edits | Each layer's pass gate isolates regression attribution |
| AgentAssignmentRow metadata chips | Replace `rounded-full bg-muted` pill chips with square `font-mono text-[10px] font-bold uppercase border border-border bg-muted px-1.5` labels | Keep pills | `rounded-full` pills are canonical only for semantic status badges (§5.2 design-system-v2.md); provider/model/variant are technical metadata — must use mono square label treatment |
| Create Profile Trigger | Keep `<Button>` element, strip `rounded-xl`/`rounded-full`; drop `group-hover:scale-110` transition; flatten icon container to square | Replace with `<div role="button">` | §5.4: dashed-border affordance is correct; only radius and animation are wrong. Keeping `<Button>` preserves aria-label and interaction semantics without DOM restructuring |
| CardTitle scope | Override with `font-mono text-sm font-bold uppercase` at GlobalConfigClient callsites only — not in base `card.tsx` | Change base `CardTitle` | Dashboard and other consumers do not use `CardTitle`; scoped override is narrower blast radius |
| Stat component | Fix `Stat.tsx` directly — it does NOT use `<Card>` primitive, so primitive normalization does not reach it | Wrap in normalized Card | Stat has its own raw div; must be patched explicitly |
| Badge `rounded-full` | Preserved everywhere — canonical per §5.2 | Remove on notification or settings badge | Design-system-v2.md §5.2 confirms pill form is intentional contrast element |

## Information-Architecture Divergences by Surface

### Models (`ModelsClient.view.tsx`, `AgentAssignmentRow.tsx`)

| Element | Current (wrong) | Required (v2) |
|---|---|---|
| Profile selector bar | `rounded-xl border border-border bg-card shadow-sm` | `border-2 border-border bg-card` |
| Selector bar icon container | `rounded-lg bg-primary/10 h-8 w-8` | `bg-primary/15 h-8 w-8` (square) |
| Profile Select trigger | `rounded-md border border-input shadow-sm` | `border border-input` |
| Profile Select popup | `rounded-md border bg-popover shadow-md` | `border-2 border-border bg-popover shadow-[4px_4px_0_0_var(--border)]` |
| Profile Select items | `rounded-sm px-2 py-1.5` | `px-2 py-1.5` (remove `rounded-sm`) |
| Loading state container | `rounded-xl border border-border bg-card shadow-sm` | `border-2 border-border bg-card` |
| Empty state (no catalog) container | `rounded-xl border border-border bg-card/40 p-12` | `border-2 border-border bg-card p-8` |
| Empty state icon container | `rounded-full bg-primary/10 h-16 w-16` | `bg-primary/15 h-10 w-10` (square, compact) |
| Empty state heading | `font-semibold text-card-foreground` | `font-mono text-sm font-bold uppercase text-card-foreground` |
| AgentAssignmentRow card | `rounded-xl border border-border bg-card backdrop-blur-sm` | `border-2 border-border bg-card` |
| AgentAssignmentRow icon | `rounded-lg bg-primary/10 h-9 w-9` | `bg-primary/15 h-9 w-9` (square) |
| Metadata chips (provider/model/variant) | `inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium` | `inline-flex border border-border bg-muted px-1.5 font-mono text-[10px] font-bold uppercase` |

### Profiles (`ProfilesClient.view.tsx`)

| Element | Current (wrong) | Required (v2) |
|---|---|---|
| Loading state container | `rounded-xl border border-border bg-card p-8` | `border-2 border-border bg-card p-8` |
| Create trigger outer | `rounded-xl border-2 border-dashed ... bg-primary/5 p-6` | `border-2 border-dashed border-primary/30 bg-primary/5 p-5` (square) |
| Create trigger icon | `rounded-full bg-primary/15 h-10 w-10 group-hover:scale-110` | `bg-primary/15 h-9 w-9` (square, no scale animation) |
| Create trigger label | `text-sm font-semibold text-primary` | `font-mono text-sm font-bold uppercase text-primary` |
| Profile list item card | `rounded-xl border border-border bg-card p-4` | `border-2 border-border bg-card p-4` |
| Profile icon container | `rounded-lg bg-primary/10 h-9 w-9` | `bg-primary/15 h-9 w-9` (square) |
| Edit mode heading | `font-semibold text-card-foreground` | `font-mono text-sm font-bold uppercase text-card-foreground` |
| OrchestratorPicker Select trigger | `rounded-md border border-input` | `border border-input` |
| OrchestratorPicker Select popup | `rounded-md border bg-popover shadow-md` | `border-2 border-border bg-popover shadow-[4px_4px_0_0_var(--border)]` |
| OrchestratorPicker Select items | `rounded-sm` | remove |

### Dashboard (`Dashboard.view.tsx`, `Stat.tsx`)

| Element | Current (wrong) | Required (v2) |
|---|---|---|
| Stat card container | `rounded-xl border border-border bg-card p-6 shadow-sm` | `border-2 border-border bg-card p-4` |
| Stat icon container | `rounded-lg bg-primary/10 p-2.5` | `bg-primary/15 p-2` (square) |
| Section headings (h2) | `text-base font-medium text-foreground` | `font-mono text-sm font-bold uppercase text-foreground` |
| Page eyebrow (p) | `text-xs font-medium uppercase tracking-wider text-muted-foreground` | `font-mono text-xs font-bold uppercase text-muted-foreground` |

### Settings (`GlobalConfigClient.tsx`)

| Element | Current (wrong) | Required (v2) |
|---|---|---|
| Header icon span | `rounded-xl bg-primary/10 size-10` | `bg-primary/15 size-10` (square) |
| Card section icon spans | `rounded-lg bg-primary/10 size-9` | `bg-primary/15 size-9` (square) |
| CardTitle for config sections | `font-semibold leading-none tracking-tight` (via base) | add `className="font-mono text-sm font-bold uppercase"` at callsite |
| Select trigger | `rounded-md border border-input` | `border border-input` |
| Select popup | `rounded-md border bg-popover p-1 shadow-md` | `border-2 border-border bg-popover p-1 shadow-[4px_4px_0_0_var(--border)]` |
| Select items | `rounded-sm` | remove |

### Shell + Notifications

| Element | Current (wrong) | Required (v2) |
|---|---|---|
| Search Input | `rounded-[.4rem]` | remove |
| Search clear button | `rounded-full` | remove |
| NotificationItem dismiss button | `rounded-md` | remove |

## File Changes

| File | Action | Layer | Nature |
|------|--------|-------|--------|
| `src/components/ui/button.tsx` | Modify | 1 | Class: remove `rounded-lg` (base) and `rounded-[min(...)]` (xs/sm/icon-xs/icon-sm size variants) |
| `src/components/ui/card.tsx` | Modify | 1 | Class: `rounded-xl` → none; `shadow` → `shadow-[4px_4px_0_0_var(--border)]`; `border` → `border-2 border-border` |
| `src/components/ui/confirm-dialog.tsx` | Modify | 1 | Class + hierarchy: `rounded-xl border border-border shadow-lg` → `border-2 border-border shadow-[4px_4px_0_0_var(--border)]`; title → `font-mono text-sm font-bold uppercase` |
| `src/components/organisms/ModelsClient/ModelsClient.view.tsx` | Modify | 2 | Structural: profile bar, loading/empty-state surface and heading level, Select controls throughout |
| `src/components/molecules/AgentAssignmentRow/AgentAssignmentRow.tsx` | Modify | 2 | Structural: card surface, icon container, metadata chip treatment (rounded-full pills → square mono labels) |
| `src/components/organisms/ProfilesClient/ProfilesClient.view.tsx` | Modify | 2 | Structural: loading state, create trigger (radius + animation + label typography), profile cards, icon containers, edit heading, OrchestratorPicker selects |
| `src/components/atoms/Stat/Stat.tsx` | Modify | 2 | Structural: card surface (does NOT inherit from ui/card), icon container — must patch explicitly |
| `src/components/organisms/Dashboard/Dashboard.view.tsx` | Modify | 2 | Hierarchy: section h2 headings and page eyebrow → mono uppercase |
| `src/components/organisms/GlobalConfigClient/GlobalConfigClient.tsx` | Modify | 2 | Structural: icon span containers, CardTitle overrides, Select trigger/popup/items |
| `src/components/organisms/DashboardLayout/DashboardLayout.view.tsx` | Modify | 3 | Class: search Input `rounded-[.4rem]`, clear button `rounded-full` |
| `src/components/notifications/NotificationItem.tsx` | Modify | 3 | Class: dismiss button `rounded-md` |

**Unchanged (already v2-compliant)**: `BackupsClient.view.tsx` card surfaces, `DeleteBackupModal.tsx`, `NotificationPanel.tsx` header border, `CreateProfileModal.tsx` modal surface.

## Interfaces / Contracts

No TypeScript interfaces, prop signatures, data contracts, or route handlers change. All `onSave`, `onSwitch`, `onDelete`, `onRestore`, `onControlsChange` handlers, ARIA labels, and `role=` attributes are preserved exactly.

## Testing Strategy

| Layer | Gate | Expected Impact |
|-------|------|-----------------|
| After Layer 1 (primitives) | `npm test` must pass 100% | Class changes only; no DOM restructuring; behavioral tests unaffected |
| After Layer 2 each file | `npm test` must pass 100% | Structural JSX changes possible; tests assert interactions/ARIA — not classNames. If a test fails, investigate before proceeding |
| After Layer 3 | `npm test` must pass 100% | Class-only; no impact expected |
| Visual gate | Browser diff against `C:\DEV_PERSON\SCREENSHOT\s-preset\img-v2\` | All in-scope surfaces: square corners, hard borders, hard shadows, mono labels, compact hierarchy |

**Specific risk**: `AgentAssignmentRow` metadata chip restructuring changes element content from `<span className="rounded-full bg-muted ...">provider</span>` to square mono labels. If `ModelsClient.view.test.tsx` or `listing-integration.test.tsx` asserts the presence of those spans by class, it will fail and need a targeted update. Inspect test files before applying this change.

## Threat Matrix

N/A — no routing, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Pure view-layer restructuring.

## Migration / Rollout

No migration required. Rollback: `git revert` of each layer's commit in reverse order. No schema, API, or data changes.

## Open Questions

- [ ] Verify `ModelsClient.view.test.tsx` and `listing-integration.test.tsx` do not assert `rounded-full` class on metadata chips before applying AgentAssignmentRow change
- [ ] Confirm `Stat.tsx` has no dedicated test that asserts `rounded-xl` or `shadow-sm` classNames (no test file found in CodeGraph — likely safe)
