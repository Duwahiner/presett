# Proposal: Design System v2 — Brutalist Control-Room Migration

## Intent

PreSett's visual shell still follows shadcn defaults: rounded controls, soft shadows, 64px header, mixed-case labels, and inconsistent font usage. The approved design guide (`docs/design-system-v2.md`) defines a "digital brutalism / terminal control-room" system with strict token contracts. This change migrates the visual token system across the existing product surface and resolves the two behavioral conflicts (Restore Backup, Delete Backup) confirmed against the 11-screen V0 reference and owner screenshots. Building the three missing routes (Agents, Permissions, Sync Activity) is explicitly deferred to future work — this change only touches routes that already exist today.

## Scope

### In Scope

- **Token migration**: replace CSS variables for color, radius (→ 0), typography, borders, shadows, and layout dimensions across `globals.css` and all token consumers following `docs/design-system-v2.md`
- **Layout contract**: header → 72px, sidebar → 260px, wordmark `PRESETT` in uppercase monospaced, square workspace avatar (no radius)
- **Typography strategy**: `--font-mono-jb` (JetBrains Mono, already loaded) for nav labels, badges, and technical data; `--font-inter` (Inter, already loaded) for long-form text — applied consistently, not re-integrated
- **Badge primitive**: unified contract `h-7 rounded-full font-mono text-[11px] font-bold leading-4 uppercase`, semantic background 15%, semantic border 50%
- **Radius audit**: remove `rounded-lg`, `rounded-2xl`, `rounded-xl`, `rounded-full` from non-badge/non-permitted controls; zero radius everywhere else
- **Shadow tokens**: hard solid shadow `4px 4px 0 0` on `--border`, no blur — to be visually verified in `sdd-design` before locking
- **Page reskin**: Dashboard (`/`), Models (`/models`), SDD Profiles (`/profiles`), Backups (`/backups`)
- **Route rename**: `/config` → `/settings` (route, nav label, redirect); functional scope of the settings form unchanged — no new advanced fields from #69
- **Notification panel reskin**: `NotificationPanel` / `NotificationItem` aligned to v2 `// NOTIFICATIONS` double-bar style as a compact floating popover anchored to the bell in the header; it overlays the active page and does not use a full-height drawer/backdrop
- **Restore Backup behavior fix**: remove `restoreConfirmId` confirmation flow → immediate execution + `✓ Restored {name}` toast
- **Delete Backup — new confirmation modal**: `DELETE BACKUP?` / `This action permanently removes {name}.` / CANCEL (outline) + DELETE (magenta solid) + ✕ close
- **Create Profile modal alignment**: single "Profile name" field, inline validation `Name is required.`, CANCEL + SAVE PROFILE — exact PDF contract
- **Dashboard version display**: Gentle-AI version uses existing `probeGentleAiVersion`; OpenCode/Claude Code/Codex versions omitted (no canonical source) — show install/config status only
- **Sidebar nav structure**: reskin the current groups as-is — `[ Menu ]` (Dashboard, Models, SDD Profiles, Backups) + `[ Workspace ]` (Settings). No new nav items added.

### Out of Scope

- **`/agents`, `/permissions`, `/sync-activity` routes** — owner decision: these are future development, not part of this change. This migration only reskins routes that exist today; it does not build new pages or nav entries for them. Tracked separately as issues #89 (Agents), #90 (Permissions), #91 (Sync Activity).
- #59 Reusable templates
- #58 Multiple environments and paths
- #55 Onboarding and prerequisite checklist
- #54 Duplicate / import / export profiles
- #53 Change history and guided rollback (beyond the Restore Backup toast)
- #57 Full queryable audit trail
- #69 Advanced OpenCode parameters (temperature, tokens, timeout) in Settings
- Any new version probe for OpenCode / Claude Code / Codex
- Responsive breakpoint system changes (existing `md:` breakpoint reused as-is)
- Translations/tests for routes not being built in this change

## Capabilities

### New Capabilities

- `delete-backup-modal`: confirmation modal contract for destructive backup removal

Note: `/agents`, `/permissions`, and `/sync-activity` are explicitly NOT new capabilities of this change — deferred to future work per owner decision.

### Modified Capabilities

- `design-tokens`: CSS variable set (`--radius`, `--border`, semantic colors, shadow utilities) aligned to v2 guide; zero radius global default
- `layout-shell`: header height, sidebar width, wordmark, workspace avatar, sidebar nav group structure
- `badge-primitive`: unified visual and typography contract across all status badges
- `dashboard-page`: v2 widget layout, Gentle-AI version stat, omit unprobed agent versions
- `models-page`: v2 reskin, preserve model-assignment behavior
- `profiles-page`: v2 reskin + Create Profile modal aligned to PDF contract
- `backups-page`: v2 reskin + Restore immediate execution + Delete confirmation modal
- `settings-route`: rename from `/config`, preserve current form scope
- `notification-panel`: v2 double-bar style reskin

## Approach

Token-first migration (recommended approach from exploration). Establish the exact CSS variable contract, zero-radius global, typography role split, badge primitive, and 72/260 layout shell first. Then reskin each existing page against its reference screen with explicit acceptance criteria. Resolve the two behavioral conflicts (Restore, Delete) at the data layer before the UI layer to avoid shadcn accessibility regressions. Auditing hardcoded utility classes (`rounded-*`, `shadow-*`) is a prerequisite for each page task, not a final pass. The token/primitive layer is built so that Agents, Permissions, and Sync Activity can reuse it directly once that future work is scoped — but building those pages is not part of this change.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/globals.css` | Modified | Full token replacement: colors, radius, shadows, typography variables |
| `src/app/layout.tsx` | Modified | Header 72px, sidebar 260px, wordmark, avatar, nav group structure |
| `src/app/page.tsx` + `Dashboard*` | Modified | v2 widget layout, version stat sources, agent status display |
| `src/app/models/` | Modified | v2 reskin; preserve model-assignment behavior |
| `src/app/profiles/` | Modified | v2 reskin + Create Profile modal contract |
| `src/app/backups/` | Modified | v2 reskin + remove `restoreConfirmId` + Delete modal |
| `src/app/config/` → `src/app/settings/` | Renamed | Route rename; form scope unchanged |
| `src/components/ui/badge.tsx` | Modified | Unified v2 badge contract |
| `src/components/organisms/NotificationPanel*` | Modified | v2 anchored floating popover + double-bar style |
| `src/resources/` | Modified | Translations for renamed settings route only |

*Not touched in this change: `src/app/agents/`, `src/app/permissions/`, `src/app/sync-activity/` — deferred to future work.*

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hardcoded `rounded-*` / `shadow-*` utilities override new tokens | High | Mandatory per-page audit before pixel tuning; lint rule candidate |
| `--border` to white/black change breaks focus rings and disabled states | Med | Accessibility pass after token swap; verify contrast ratios before merging |
| Restore immediate-execution breaks existing API/UI confirmation contracts | Med | Remove `restoreConfirmId` only after verifying no other consumer depends on the confirm path |
| Hard-shadow offset `4px 4px 0 0` is an assumption, not a locked spec | Low | Visual confirmation against V0 preview during `sdd-design`; offset locked there |
| Notification panel felt like a drawer instead of a floating popover | Med | Lock the panel to the bell-triggered anchored overlay contract from PDF screen 9; no full-height backdrop |
| Sidebar reads as incomplete without Agents/Permissions/Sync Activity (visible in the v2 reference but not built here) | Low | Explicitly documented as deferred; no nav placeholders or broken links added |
| Dashboard/Agents version omission looks like a bug to users | Low | Explicit "status only" display pattern with tooltip/label clarifying no version probe exists |

## Rollback Plan

All token changes are in `globals.css` and Tailwind config — revert those files to restore the previous visual shell. The `/config` → `/settings` rename requires restoring the directory and the nav label. The Restore Backup behavioral change is isolated to `BackupsClient` — revert to prior `restoreConfirmId` state. No database or file-system data migration is involved.

## Dependencies

- `docs/design-system-v2.md` — authoritative token and component specification
- V0 project "PreSett-v2" (chat id `6wobE8XXIwR`) — 11-screen visual reference
- Exploration artifact: `openspec/changes/design-system-v2/exploration.md`
- Existing font loading: `--font-inter` and `--font-mono-jb` in `src/app/layout.tsx`

## Success Criteria

- [ ] All CSS token variables match `docs/design-system-v2.md` section by section
- [ ] Zero `rounded-lg / rounded-2xl / rounded-xl` outside badges and explicitly permitted controls
- [ ] Header renders at 72px, sidebar at 260px, wordmark `PRESETT` uppercase monospaced
- [ ] Dashboard, Models, SDD Profiles, Backups — each passes visual acceptance against the reference screen
- [ ] Restore Backup: no confirmation modal, toast `✓ Restored {name}` shown on success
- [ ] Delete Backup: `DELETE BACKUP?` modal renders and executes destruction on DELETE
- [ ] Create Profile modal: single name field, inline `Name is required.`, CANCEL + SAVE PROFILE
- [ ] `/settings` route accessible; `/config` redirects or is removed from nav
- [ ] Notification panel renders as a compact floating popover anchored to the bell, with v2 double-bar style
- [ ] No regressions in existing Vitest suites (no className assertions; behavior and accessibility contracts pass)
- [ ] Sidebar shows only Dashboard, Models, SDD Profiles, Backups, Settings — no Agents/Permissions/Sync Activity links added
