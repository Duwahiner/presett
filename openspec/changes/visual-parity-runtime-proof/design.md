# Design: Visual Parity Runtime Proof

## Technical Approach

Introduce a server-read env flag (`PRESETT_VISUAL_AUDIT=1`) threaded as a boolean prop from `layout.tsx` into a new `AuditModeContext`. Client organisms read `useAuditMode()` to short-circuit data loading to typed fixtures and no-op all mutations. Dashboard server path bypasses `fetchDashboardData` entirely. `ThemeProvider` receives `forcedTheme="dark"` and the `<html>` element carries `class="dark"` before hydration. A dev-only Playwright harness captures at the reference viewport and pixel-diffs against committed references. Zero new routes; zero production-reachable audit paths.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Global Axios interceptor | Affects server-side requests; hard to tree-shake; opaque to tests | ❌ |
| Per-component `useAuditMode()` short-circuit | Explicit, testable, zero production overhead when flag absent | ✅ |
| `NEXT_PUBLIC_` env var | Leaks into client JS bundle unconditionally | ❌ |
| Server-only env + prop threading through `AuditModeProvider` | Flag visible only when server started with it; not present in production bundle | ✅ |
| Replace `NotificationProvider` with `AuditNotificationProvider` | Extra context but isolates localStorage completely; no service calls | ✅ |
| Inject fixtures into existing `NotificationProvider` via `push()` | Writes to localStorage (non-deterministic IDs); violates read-only contract | ❌ |
| Harness as Next.js route | Requires auth, port wiring, app changes | ❌ |
| Harness as dev-only Playwright script | Self-contained, no app surface, trivially excluded from builds | ✅ |

## Data Flow

```
process.env.PRESETT_VISUAL_AUDIT (server only)
  │
  ├─ layout.tsx (Server SC)
  │    ├─ <html className="dark"> (forced before hydration)
  │    ├─ ThemeProvider forcedTheme="dark" + disables storageKey writes
  │    └─ AuditModeProvider isAuditMode={true}
  │         ├─ AuditNotificationProvider (fixture notifs, no-op mutations)
  │         ├─ ModelsClient → useAuditMode() → AUDIT_FIXTURE_CONFIG + deny writes
  │         ├─ ProfilesClient → useAuditMode() → AUDIT_FIXTURE_PROFILES + deny writes
  │         ├─ BackupsClient → useAuditMode() → AUDIT_FIXTURE_BACKUPS + deny writes
  │         ├─ GlobalConfigClient → useAuditMode() → AUDIT_FIXTURE_GLOBAL_CONFIG + deny writes
  │         └─ DashboardLayoutView → hide Sync button + ThemeToggle
  │
  └─ page.tsx (Server SC)
       └─ IS_VISUAL_AUDIT_MODE → buildDashboardData(AUDIT_FIXTURE_*) with frozen timestamp
                                  └─ Dashboard (deterministic render)

Normal runtime (env unset):
  layout.tsx → no AuditModeProvider → no fixture code path reachable
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/lib/visual-audit/index.ts` | Create | `IS_VISUAL_AUDIT_MODE = process.env.PRESETT_VISUAL_AUDIT === "1"` (server import only) |
| `src/lib/visual-audit/fixtures.ts` | Create | Typed fixture constants for all 8 surfaces; `AUDIT_FIXTURE_TIMESTAMP = "2026-01-15T10:30:00.000Z"` frozen |
| `src/lib/visual-audit/audit-context.tsx` | Create | `AuditModeContext`, `AuditModeProvider`, `useAuditMode()`, `AuditNotificationProvider` |
| `src/lib/visual-audit/audit-ready-signal.tsx` | Create | `<AuditReadySignal>` emits `data-audit-ready="true"` on root element when `loading=false` |
| `src/lib/visual-audit/harness.ts` | Create | Dev-only Playwright capture + pixel-diff script; outputs per-route pass/fail |
| `src/lib/visual-audit/references/` | Create | Committed reference PNGs per route at reference viewport |
| `src/app/layout.tsx` | Modify | Read `IS_VISUAL_AUDIT_MODE`; add `dark` to `<html>` className; wrap tree with `AuditModeProvider` |
| `src/lib/theme-provider.tsx` | Modify | Accept `forcedTheme?: string` prop; forward to `NextThemesProvider`; skip `storageKey` when forced |
| `src/app/page.tsx` | Modify | When `IS_VISUAL_AUDIT_MODE`: call `buildDashboardData(AUDIT_FIXTURE_*)` with pre-computed frozen `lastSync`; skip `fetchDashboardData` |
| `src/components/organisms/ModelsClient/ModelsClient.tsx` | Modify | `useAuditMode()` → seed state from `AUDIT_FIXTURE_CONFIG`; all mutation handlers early-return when audit |
| `src/components/organisms/ProfilesClient/ProfilesClient.tsx` | Modify | `useAuditMode()` → seed from `AUDIT_FIXTURE_PROFILES`; deny create/switch/delete/update |
| `src/components/organisms/BackupsClient/BackupsClient.tsx` | Modify | `useAuditMode()` → seed from `AUDIT_FIXTURE_BACKUPS`; deny sync/pin/unpin/delete/restore |
| `src/components/organisms/GlobalConfigClient/GlobalConfigClient.tsx` | Modify | `useAuditMode()` → seed from `AUDIT_FIXTURE_GLOBAL_CONFIG`; deny both save handlers |
| `src/components/organisms/DashboardLayout/DashboardLayout.view.tsx` | Modify | When audit: hide Sync button, hide ThemeToggle; swap `NotificationProvider` for `AuditNotificationProvider` |

## Interfaces / Contracts

```typescript
// src/lib/visual-audit/index.ts
export const IS_VISUAL_AUDIT_MODE: boolean;        // server-only

// src/lib/visual-audit/audit-context.tsx
export const AuditModeContext: Context<boolean>;
export function AuditModeProvider({ isAuditMode, children }: { isAuditMode: boolean; children: ReactNode }): JSX.Element;
export function useAuditMode(): boolean;
export function AuditNotificationProvider({ children }: { children: ReactNode }): JSX.Element;
// → provides NotificationContextValue with AUDIT_FIXTURE_NOTIFICATIONS; push/resolve/dismiss/markAllRead are no-ops

// src/lib/visual-audit/fixtures.ts
export const AUDIT_FIXTURE_TIMESTAMP: string;      // "2026-01-15T10:30:00.000Z"
export const AUDIT_FIXTURE_LAST_SYNC: string;      // pre-computed relative string from frozen timestamp
export const AUDIT_FIXTURE_CONFIG: { assignments: DashboardAgent[]; defaultAgent: string };
export const AUDIT_FIXTURE_PROFILES: { profiles: Profile[] };
export const AUDIT_FIXTURE_BACKUPS: { backups: BackupInfo[] };
export const AUDIT_FIXTURE_CATALOG: ModelCatalog;
export const AUDIT_FIXTURE_GLOBAL_CONFIG: GlobalConfig;
export const AUDIT_FIXTURE_NOTIFICATIONS: Notification[];

// src/lib/visual-audit/audit-ready-signal.tsx
export function AuditReadySignal({ loading }: { loading: boolean }): null;
// Sets data-audit-ready on document.documentElement when loading transitions to false
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (RED) | `IS_VISUAL_AUDIT_MODE` is `false` when env unset | Vitest; assert `false` without env var |
| Unit (RED) | Mutation handlers no-op in audit mode | Render client with `AuditModeProvider isAuditMode={true}`; call handler; assert no `api` call |
| Unit (RED) | `AuditNotificationProvider.push` is a no-op | Call `push(draft)`; assert `getAll()` returns fixture-only array |
| Unit (RED) | `ThemeProvider` forwards `forcedTheme="dark"` | Spy on `NextThemesProvider`; assert prop present |
| Unit (GREEN) | Fixtures are stable between renders | Render twice; assert identical snapshot |
| Integration | `page.tsx` bypasses `fetchDashboardData` | Mock `IS_VISUAL_AUDIT_MODE=true`; assert no service calls made |
| Harness | Per-route pixel-diff ≤ threshold | `harness.ts` produces JSON report; assert all routes pass |

## Threat Matrix

N/A — no routing, shell command, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary in production code. The harness script is a development-only tool never imported by the Next.js application.

## Migration / Rollout

No migration required. The env var is never set in production or CI production jobs. Rollback: delete `src/lib/visual-audit/`, revert the five modified files (`layout.tsx`, `theme-provider.tsx`, `page.tsx`, `DashboardLayout.view.tsx`, and each of the four Client organisms). No user-visible state exists to clean up because the env var was never active outside development.

## Open Questions

- [ ] What pixel-diff threshold (%) qualifies as pass for each route? (Suggest ≤0.1% for deterministic fixture renders)
- [ ] Reference viewport resolution: use existing screenshot dimensions (1478×968) or align to 1440×900? Requires owner decision before reference PNGs are committed.
