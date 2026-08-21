# Design: Design System v2 — Brutalist Control-Room Migration

## Technical Approach

Token-first reskin of the five existing routes (`/`, `/models`, `/profiles`, `/backups`, `/settings`).
Establish the CSS variable contract, zero-radius global, typography roles, badge primitive, and 72/260
shell first; then migrate each page against its reference screen. Two behavioral fixes land at the
component layer (Restore → immediate, Delete → confirmed modal). `NotificationPanel` is rebuilt from
a full-height drawer into a Radix `Popover` anchored to the bell.

---

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| NotificationPanel architecture | Radix `Popover`: `BellButton` as `PopoverTrigger`, `NotificationPanel` as `PopoverContent` | Custom `position:fixed` anchored to bell coords | Radix handles Escape, outside-click, `aria-expanded`, and focus-return for free; no backdrop div needed; matches existing shadcn/Radix pattern |
| `/config` → `/settings` rename | Create `src/app/settings/`; add Next.js `redirect('/settings')` in `src/app/config/page.tsx` | Delete `/config` directory entirely | Redirect protects bookmarks and any in-process navigation to `/config`; zero-cost safety net |
| Restore behavior | Remove `restoreConfirmId` state; call `restoreBackup(id, { confirmed: true })` directly in new `handleRestore(id)` | Keep two-step confirm | v2 spec mandates immediate execution + toast. `confirmed: true` is a **server-side mutation guard** enforced at route handler line 90 (`src/app/api/backups/[id]/route.ts`) — omitting it returns HTTP 400. The UI modal is removed; the API param is not optional and must remain in the call |
| `/diagnostics` nav link | Remove from sidebar nav; route `src/app/diagnostics/` stays intact | Keep nav link | Final v2 nav is Dashboard, Models, SDD Profiles, Backups, Settings only — confirmed by proposal success criteria and owner. Route removal is out of scope; only the `navItems` array entry is dropped in `DashboardLayout.view.tsx` |
| Hard shadow token | `4px 4px 0 0 var(--border)`, no blur — locked per `docs/design-system-v2.md` §1 | Other offsets | Design guide explicitly states fixed solid offset, no blur; V0 reference confirms |
| `DeleteBackupModal` placement | New `src/components/organisms/DeleteBackupModal/` rendered in `BackupsClient.view.tsx` | Inline JSX in view | Existing `deleteConfirmId` flow is already correct behavior-wise; only the visual component and copy are new; keeps view readable |

---

## Data Flow

```
Header
  └─ <Popover onOpenChange={markAllRead}>
       ├─ <PopoverTrigger asChild> → BellButton (bell icon + unread badge)
       └─ <PopoverContent> → NotificationPanel
              │  useNotifications() → notificationService (localStorage)
              │  Escape / outside click  →  Popover auto-closes (Radix)
              └─ on close              →  focus returns to BellButton (Radix)

BackupsClient
  handleRestore(id)
    → restoreBackup(id, { confirmed: true })   ← server guard; HTTP 400 without it
    → refresh()
    → onSuccess("✓ Restored {name}")

  handleDelete triggers setDeleteConfirmId(id)
    → DeleteBackupModal renders
    → CANCEL → setDeleteConfirmId(null)
    → DELETE  → handleDeleteConfirm() → deleteBackup(id, { confirmed: true }) → refresh()
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/globals.css` | Modify | Replace token vars: `--radius: 0rem`, full dark/light palette, hard-shadow utility class |
| `src/components/organisms/DashboardLayout/DashboardLayout.view.tsx` | Modify | Header `h-[72px]`, sidebar `w-[260px]`, PRESETT wordmark mono, square workspace avatar, nav groups `[MENU]`/`[WORKSPACE]`, `<Popover>` composition around bell; remove `/diagnostics` from `navItems` array |
| `src/components/notifications/NotificationPanel.tsx` | Modify | Drop `fixed inset-0` overlay + backdrop; render as bare `PopoverContent` body; `// NOTIFICATIONS` double-bar header; v2 item styling; remove manual Escape/focus-trap (Radix owns those) |
| `src/components/notifications/BellButton.tsx` | Modify | Remove `open`/`onToggle` props (Radix manages via `PopoverTrigger`); unread badge stays, styled v2 |
| `src/components/ui/badge.tsx` | Modify | `h-7 rounded-full font-mono text-[11px] font-bold leading-4 uppercase`, semantic 15%/50% bg/border |
| `src/components/organisms/BackupsClient/BackupsClient.tsx` | Modify | Remove `restoreConfirmId` state + `handleRestoreConfirm`; add `handleRestore(id)` direct call |
| `src/components/organisms/BackupsClient/BackupsClient.types.ts` | Modify | Drop `restoreConfirmId`, `onRestoreConfirm`, `onRestoreCancel` from `BackupsClientViewProps` |
| `src/components/organisms/BackupsClient/BackupsClient.view.tsx` | Modify | v2 reskin; `onRestore` calls directly; render `<DeleteBackupModal>` |
| `src/components/organisms/DeleteBackupModal/` | Create | `DELETE BACKUP?` / `This action permanently removes {name}.` / CANCEL (outline) + DELETE (magenta solid) + ✕ |
| `src/app/settings/` | Create | Route dir adapted from `/config`; page + layout unchanged in behavior |
| `src/app/config/page.tsx` | Modify | Add `redirect('/settings')` |
| `src/app/page.tsx` + `Dashboard*` | Modify | v2 widget layout; Gentle-AI version via existing `probeGentleAiVersion`; agent version omitted |
| `src/app/models/` | Modify | v2 reskin; model-assignment behavior preserved |
| `src/app/profiles/` | Modify | v2 reskin + Create Profile modal: single name field, inline `Name is required.`, CANCEL + SAVE PROFILE |
| `src/resources/` | Modify | Keys: `nav_settings`, `notif_panel_title` → `// NOTIFICATIONS`, `delete_backup_*` copy |

---

## Interfaces / Contracts

```typescript
// BackupsClientViewProps — pruned (BackupsClient.types.ts)
interface BackupsClientViewProps {
  onRestore: (id: string) => void;   // direct — no confirm step
  deleteConfirmId: string | null;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  // REMOVED: restoreConfirmId, onRestoreConfirm, onRestoreCancel
}

// NotificationPanel — new shape (rendered inside PopoverContent)
// Props removed: open, onClose  — Radix Popover owns open state
// Parent: <Popover onOpenChange={(o) => o && markAllRead()}>
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `DeleteBackupModal` renders title/body/actions per contract | Vitest + RTL; assert text, button variants |
| Unit | `NotificationPanel`: no `fixed inset-0` in DOM; unread/read/dismiss still work | Vitest + RTL; class assertion + behavior |
| Unit | `BackupsClient` restore calls API immediately on first click with `{ confirmed: true }`, no confirm state | Mock `restoreBackup`; assert called once with confirmed param, no modal shown |
| Unit | Badge classes: `font-mono text-[11px] uppercase` present | Class assertion |
| RED | Navigate to `/config` — assert redirect to `/settings` | Playwright / integration test |
| Integration | Full delete flow: Delete click → modal → confirm → API → modal closes | Vitest + RTL through `BackupsClient` |

---

## Threat Matrix

| Boundary | Applicable? | Notes |
|----------|-------------|-------|
| Route navigation | **Applicable** | `/config` rename: `redirect('/settings')` required; RED test: GET `/config` → 307 to `/settings` |
| Shell / subprocess | N/A | No new spawn calls; `probeGentleAiVersion` is pre-existing |
| VCS / PR automation | N/A | Not touched |
| Executable-file classification | N/A | Not touched |
| Process integration | N/A | `restoreBackup` / `deleteBackup` API calls pre-existing; no new process boundary |

---

## Migration / Rollout

No database or file-system migration required. Token change is atomic: revert `globals.css` and
`DashboardLayout.view.tsx` to fully restore the prior shell. `/config` redirect is independently
removable. No persistent user data is affected.

---

## Resolved Decisions (pre-finalization)

Both questions that were open at initial draft are now resolved by direct code inspection:

1. **`confirmed: true` API param** — `src/app/api/backups/[id]/route.ts` line 90 enforces
   `body.confirmed !== true → HTTP 400` for both `restore` and `delete` actions. This is a
   server-side mutation guard, not a UI-confirmation mirror. `restoreBackup(id, { confirmed: true })`
   must be called as-is; only the UI modal is removed. Verified: `backupsApiService.ts` signature
   already makes `options` optional, so the client call is valid with or without it — but must
   include it to avoid 400 from the route handler.

2. **`/diagnostics` nav link** — confirmed by proposal success criteria and owner decision: the
   `navItems` entry for `{ href: "/diagnostics" }` is removed from `DashboardLayout.view.tsx`;
   the route and its page files are untouched. Final sidebar: Dashboard, Models, SDD Profiles,
   Backups, Settings.
