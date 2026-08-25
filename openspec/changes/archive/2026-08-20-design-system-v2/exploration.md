## Exploration: PreSett v2 brutalist control-room UI migration

### Current State

PreSett is a Next.js 16 application with an App Router shell. `src/app/layout.tsx` wraps the existing routes in `DashboardLayout`; the shell currently exposes Dashboard, Models, Profiles, Backups, Diagnostics, and Config. The implementation already has reusable client workflows for model routing, profiles, backups, notifications, theme switching, and global configuration, but most visual primitives still follow shadcn defaults: rounded controls/cards, soft shadows, 64px header, and 256px sidebar.

The approved design source is `docs/design-system-v2.md`, supplemented by the 11-screen V0 reference. The migration is primarily a visual reskin plus information-architecture work for missing surfaces, but several approved issues introduce future functional screens that the 11-screen reference does not cover.

### Screen mapping

| Reference screen / flow | Current route | Status | Main components / evidence |
|---|---|---|---|
| Dashboard / Workspace Overview | `/` | Exists, visually misaligned and functionally incomplete against reference | `src/app/page.tsx`, `Dashboard`, `Dashboard.view.tsx`, `DashboardLayout` |
| Agents / Installed Integrations | None | Does not exist as a dedicated screen; agent data is currently embedded in Dashboard and model assignment structures | `DashboardAgent`, `AgentAssignmentRow`, `src/types/agent.ts`; new route and page composition required |
| Models / Model Routing | `/models` | Exists, visually misaligned; current model-assignment behavior must be preserved | `ModelsClient`, `ModelPicker`, `AgentAssignmentRow` |
| SDD Profiles | `/profiles` | Exists, visually misaligned; create flow is currently embedded in the page rather than matching the reference modal contract | `ProfilesClient`, `ProfilesClient.view.tsx`, profile APIs and tests |
| Create Profile modal | `/profiles` | Partially exists, behavior/UI contract needs alignment | `ProfilesClient` creation state (`newName`, assignments), form validation, modal/dialog components to be confirmed |
| Backups / Snapshots | `/backups` | Exists, visually misaligned and behaviorally conflicting with reference | `BackupsClient`, `BackupsClient.view.tsx`, backup API; current client has `restoreConfirmId`, while reference requires immediate restore + toast |
| Restore Backup flow | `/backups` | Exists with a confirmation flow, which is not the approved v2 reference behavior | `BackupsClient.handleRestoreConfirm`, `restoreBackup`, notification toasts |
| Permissions / Access Control | None | Does not exist | No route or dedicated permission component found; new read-only page required |
| Settings / Workspace Configuration | `/config` | Exists, visually misaligned; likely maps to Settings but scope must be reconciled with approved configuration issues | `GlobalConfigClient`, config route/API, `DashboardLayout` navigation |
| Sync Activity / Workspace Events | No dedicated route | Not present as the documented read-only event-log screen; diagnostics and notifications provide related information only | `diagnosticsService`, notification service, sync handlers; likely new route/data projection |
| Notification panel | Overlay from every shell route | Exists functionally, visually misaligned with v2 | `NotificationProvider`, `NotificationPanel`, `NotificationItem`, `BellButton`; persistent unread/read/dismiss behavior already exists |

### Functional gaps

- **Agents:** there is no `/agents` route. Agent identifiers and detection/configuration types exist, and Dashboard receives an `agents` array, but the reference requires a dedicated list of OpenCode, Claude Code, and Codex cards with configuration actions.
- **Permissions:** no route, data model, or dedicated view was found for the read-only ALLOWED permission list.
- **Sync Activity:** no dedicated chronological workspace-events page was found. Existing sync feedback is transient/persistent notification-oriented, not a queryable activity log.
- **Dashboard content:** existing `DashboardStats` models model/profile/backup counts, while the reference calls for Gentle-AI version, OpenCode version, backup count, and last sync. The source of the two version values and the exact installed-agent status projection need confirmation.
- **Profile creation:** the current Profiles client supports name plus model assignments; the reference modal specifies one profile-name field and a focused validation contract. This is an information-architecture change, not just CSS.
- **Restore behavior:** current code stores `restoreConfirmId` and calls the API with `confirmed: true`; the reference explicitly requires immediate restore and a success toast. This conflicts with the approved historical issue #3/#53 confirmation expectations and must be resolved before implementation.
- **Header actions:** Dashboard currently has shell-level search, bell, theme, account, and sync controls, but the reference-specific `+ CREATE PROFILE` and `VIEW BACKUPS` placements/links require page-level composition changes.

### Visual gaps

- Global radius is not yet consistently zero: layout links use `rounded-lg`, search clear uses `rounded-full`, mobile navigation uses `rounded-2xl`, notification items use `rounded-xl`, and `ErrorBanner` uses `rounded-lg`. Only badges and explicitly permitted compact controls should remain rounded.
- Cards and panels need `border-2`, hard visible borders, `rounded-none`, and solid no-blur shadows. Current components use standard shadcn borders and soft shadows such as `shadow-xl`.
- Header is `h-16` (64px); target is 72px. Sidebar is `w-64` (256px); target is 260px.
- Existing sidebar branding is a rounded icon plus title-case `PreSett`; target is the square workspace tile and uppercase monospaced `PRESETT` wordmark.
- Navigation labels and technical/status data need monospaced uppercase treatment. The current shell uses ordinary font weights and mixed-case translated labels.
- Badge implementation must converge on `h-7`, `rounded-full`, `font-mono text-[11px] font-bold leading-4 uppercase`, semantic background at 15%, and semantic border at 50%, with one contextual icon.
- Existing icon/action reuse must be audited against the “one icon per visible action/state” rule, especially dashboard quick actions and shared restore/sync affordances.
- Token values are documented in CSS variables, but every consumer must be checked for assumptions about shadcn semantic colors, radius, and shadow utilities. Light mode must preserve `#f4f4f4` background, white cards, black borders, and white sidebar rather than merely inverting dark colors.
- Typography requires an explicit JetBrains Mono (or equivalent) / Inter strategy. The current codebase must be checked for actual font loading and whether the role split can be introduced without changing body readability.

### Approved issue cross-reference

The 11-screen reference covers the core current workspace surfaces, but these approved requirements imply additional screens or flows:

| Issue | UI implication not fully covered by the reference |
|---|---|
| #69 advanced OpenCode parameters | Advanced per-agent configuration controls and field-level validation, likely an Agents or Settings sub-flow |
| #59 reusable templates | Template list, create/edit, preview, compatibility validation, apply confirmation, and sensitive-data safeguards; no reference screen covers this |
| #58 multiple environments and paths | Environment selector/management surface and an active-environment indicator before mutations; the reference assumes one workspace |
| #57 complete audit | Queryable audit history beyond the simple Sync Activity event list; may require filters, operation scope/result, and read-only guarantees |
| #55 onboarding/checklist | First-run or revisitable onboarding/checklist flow; absent from the 11 screens |
| #54 duplicate/import/export profiles | Profile actions, import/export dialogs, conflict resolution, and validation states; the reference only covers basic profile creation/editing |
| #53 change history and guided rollback | Change-history view and a deliberate rollback confirmation flow; it conflicts with the reference’s immediate backup restore if the same action is meant to serve both concepts |
| #9 remaining mutating endpoint protection | No new screen by itself, but every new UI mutation needs loopback-origin and preflight-safe error states |
| #7 API error-contract coverage | No new screen by itself; constrains safe, stable error presentation across all new flows |

Closed approved capabilities also constrain the migration: persistent notifications (#51), global search (#50), diagnostics/update checks (#49), listing filters/order (#56), mutation states (#35/#37/#38), and safe backup operations (#3/#5/#6) must not regress when their visual surfaces are reskinned.

### Approaches

1. **Token-first shell and primitive migration** — establish the exact CSS variables, radius, typography, border/shadow utilities, badge primitive, and 72/260 layout contract, then reskin existing page components and add missing routes.
   - Pros: minimizes per-screen drift; preserves shadcn composition and accessibility contracts; aligns with the documented token architecture.
   - Cons: existing utility classes can override or visually contradict the new primitives; requires a full audit before pixel tuning.
   - Effort: Medium/High

2. **Page-by-page bespoke recreation** — rebuild each reference page independently using local classes while leaving shared primitives mostly unchanged.
   - Pros: can match individual screenshots quickly.
   - Cons: duplicates tokens and interaction patterns, increases dark/light divergence, and makes missing future issue surfaces harder to integrate consistently.
   - Effort: High

### Recommendation

Use the token-first approach. Preserve the existing shadcn/Radix accessibility and state behavior, replace shared visual contracts at the theme/layout/primitive level, then migrate each page with explicit reference-to-route acceptance criteria. Treat Agents, Permissions, and Sync Activity as separate information-architecture work rather than pretending they are covered by Dashboard or Diagnostics. Resolve the restore-confirmation conflict and the issue-driven additional screens before proposal/specification.

### Risks

- Replacing `--radius`, border, and semantic color tokens is broadly compatible with shadcn components, but hard-coded utility classes (`rounded-*`, `shadow-*`, fixed heights) will continue to win and create an inconsistent hybrid unless audited.
- Changing `--border` to white in dark and black in light increases contrast and may expose components whose low-contrast borders were previously intentional; focus rings and disabled states need accessibility verification.
- The documented design guide claims light mode is verified, while the current codegraph reported recently edited theme files; direct verification of the current on-disk `globals.css` and theme provider is required before relying on that claim.
- Converting restore to immediate execution may violate existing API/UI confirmation contracts and issue #53’s guided rollback requirement. Backup restore and guided rollback may need separate commands and labels.
- New Agents/Permissions/Sync Activity routes require translations, navigation, responsive behavior, tests, and data contracts—not only visual components.
- Dashboard version and environment data may not currently be available through safe APIs; exposing local paths or runtime details would violate approved issue constraints.
- The “unique icon per visible action/state” rule can conflict with reusable button components and repeated rows; visual review must be per screen, not only per component.
- Pixel-perfect matching from the PDF may leave responsive and accessibility behavior underspecified, especially for the Models matrix, notification overlay, and profile modal.

### Open questions

1. ~~Should the migration change the current restore confirmation behavior now...~~ **RESOLVED (owner decision):** Restore keeps the v2 reference behavior — immediate execution, no confirmation modal, success communicated via toast (`✓ Restored {name}`). This matches the PDF exactly; current `restoreConfirmId` confirmation flow must be removed. Any guided-rollback confirmation from #53 must be a **separate, differently-labeled action**, not a reuse of Restore.
   - **New discovery from owner screenshots:** Delete backup, unlike Restore, **does** have a confirmation modal in the approved v2 design — not documented in the original 11-screen PDF. Contract: title `DELETE BACKUP?`, body `This action permanently removes {name}.`, actions `CANCEL` (outline) + `DELETE` (magenta solid), close `✕`. This must be added to the Backups screen spec.
2. ~~What are the canonical safe sources...~~ **RESOLVED (codebase verification):** `probeGentleAiVersion` (`src/services/processService.ts`, spawns `gentle-ai --version`) is a real, already-wired canonical source for the "Gentle-AI version" stat — safe to use as-is. **Gap confirmed:** there is NO canonical version source for OpenCode/Claude Code/Codex today — `detectOpenCode` (`src/adapters/opencode.ts`) only returns `installed: boolean`, and `AgentDetectionResult.version` is an optional field that nothing populates. Per issue #69's explicit discipline ("no inventar valores... si no existe fuente canónica verificable, no exponer el control"), the Dashboard/Agents version fields for OpenCode/Claude Code/Codex must either (a) get a real version probe implemented as part of this change, or (b) omit the version display and only show install/configuration status until a canonical source exists. Recommendation: (b) for this migration; version probes are separate backend work.
3. ~~Should `/config` be renamed...~~ **RESOLVED (decision):** rename route + nav label from `/config`/"Config" to `/settings`/"Settings" to match the v2 reference exactly (no evidence of external deep links to `/config` requiring a redirect). Advanced OpenCode settings from #69 stay out of scope for this visual migration — they are separate functional work for `/settings` once the canonical parameter sources are confirmed per #69.
4. ~~Are Agents, Permissions, and Sync Activity required in the primary sidebar...~~ **RESOLVED (owner screenshot):** confirmed present in the primary sidebar nav group `[ Workspace ]`, in order: Sync Activity, Permissions, Settings, alongside `[ Menu ]` group: Dashboard, Agents, Models, SDD Profiles, Backups. This is a route/nav confirmation, not just a visual mock.
5. ~~Does Sync Activity represent the same data domain as #57...~~ **RESOLVED (decision):** Sync Activity in this migration is the simple read-only rolling event list shown in the PDF (sync/manifest/snapshot/profile events), scoped exactly to what's already emitted by existing notification/sync code paths. The full queryable audit trail from #57 (filters, operation scope/result, retention) is explicitly OUT of scope for this UI migration and remains separate future work building on top of the Sync Activity surface.
6. ~~Which template, environment, onboarding, import/export, and rollback surfaces are in scope...~~ **RESOLVED (decision):** all of #59 (templates), #58 (environments), #55 (onboarding), #54 (duplicate/import/export), and #53 (guided rollback beyond the Restore Backup toast flow) are OUT of scope for this design-system migration. This change covers the 8 baseline screens + 2 flows already documented in the v2 reference, reskinned and completed (Agents/Permissions/Sync Activity built as real routes). Those 5 issues remain independent future feature work with their own screens designed later.
7. ~~What exact hard-shadow offset...~~ **PARTIALLY RESOLVED (assumption, flagged):** no numeric offset is documented anywhere (design guide, PDF, or V0 source inspected so far). Recommendation: adopt a concrete default consistent with the neobrutalist direction — solid shadow `4px 4px 0 0` using the `--border` token color, no blur, no spread beyond the offset. Responsive breakpoints follow the existing Tailwind `md:` breakpoint already used for the sidebar/mobile-nav split in `DashboardLayout.view.tsx` — no new breakpoint system needed. This should be visually verified against the live V0 preview during `sdd-design` before being locked as pixel-perfect.
8. ~~Is JetBrains Mono already loaded...~~ **RESOLVED (codebase verification):** both fonts are already wired in `src/app/layout.tsx` — `Inter` as `--font-inter` and `JetBrains_Mono` as `--font-mono-jb` (with proper fallback chain). No new font loading is required; the migration only needs to apply the existing mono font class consistently to nav/badges/technical-data per the design-system-v2.md typography rules, which is not done consistently today.

### Ready for Proposal

**Yes**, pending final owner sign-off on the resolutions above. All 8 open questions have been resolved through owner decisions and direct codebase/design-guide verification (see resolutions inline above). Summary of resolved scope:

- Restore Backup: immediate execution + toast (no confirmation), exactly per the v2 reference.
- Delete Backup: new confirmation modal contract (`DELETE BACKUP?` / `This action permanently removes {name}.` / CANCEL + DELETE) — not in the original PDF, added from owner screenshots.
- Agents, Permissions, Sync Activity: real new routes in the primary sidebar `[ Workspace ]` / `[ Menu ]` groups, not overlays.
- Dashboard/Agents version display: Gentle-AI version uses the existing `probeGentleAiVersion` source; OpenCode/Claude Code/Codex versions have no canonical source today and must be omitted (not invented) until a real probe exists.
- `/config` renamed to `/settings` to match the reference; #69 advanced settings stay out of this migration's scope.
- Sync Activity is the simple v2 event list only; #57's full audit trail is future work.
- #59/#58/#55/#54/#53 (templates, environments, onboarding, import/export, guided rollback) are all OUT of scope for this change.
- **Update (owner correction, post-proposal):** `/agents`, `/permissions`, and `/sync-activity` are also OUT of scope for this change — they are future development, not part of the current migration. This change only reskins routes that exist today (`/`, `/models`, `/profiles`, `/backups`, `/settings`); it does not build new pages or add new sidebar nav entries for them. Tracked as separate GitHub issues so they stay in focus: #89 (Agents), #90 (Permissions), #91 (Sync Activity).
- Hard-shadow offset assumption: `4px 4px 0 0` on `--border`, to be visually confirmed during `sdd-design`.
- JetBrains Mono + Inter are already loaded; this is a consistent-application problem, not a new font integration.

Next step: `sdd-propose`.
