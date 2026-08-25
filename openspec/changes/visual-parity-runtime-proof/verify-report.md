```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:424df6e84bc70527eb1e10cf2a40eb107a373c4c34a422a65b6e9fd79ffe4af1
verdict: fail
blockers: 5
critical_findings: 3
requirements: 8/18
scenarios: 14/31
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:e96e917348cb3b24454e6bda800073414c4163166c52761f6ffcc3558203a8a7
build_command: npm run build
build_exit_code: 1
build_output_hash: sha256:db0bd1b5f1494bc38389bdb3ca3b402193507e1ede491b68267b66c757e8032e
```

## Verification Report

**Change**: visual-parity-runtime-proof
**Version**: N/A
**Mode**: Standard

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 16 |
| Tasks complete | 16 |
| Tasks incomplete | 0 |

### Build & Tests Execution
**Build**: ❌ Failed (exit code 1)

```
> presett@0.1.0 build
> next build

▲ Next.js 16.3.0 (Turbopack)
✓ Running next.config.ts took 43ms
  Creating an optimized production build ...
✓ Compiled successfully in 870ms
  Running TypeScript ...
src/lib/visual-audit/__tests__/visual-audit.test.ts(19,42): error TS2769: No overload matches this call.
  Property 'children' is missing in type '{ isAuditMode: false; }' but required in type '{ isAuditMode: boolean; children: ReactNode; }'.
src/lib/visual-audit/__tests__/visual-audit.test.ts(26,42): error TS2769: No overload matches this call.
  Property 'children' is missing in type '{ isAuditMode: true; }' but required in type '{ isAuditMode: boolean; children: ReactNode; }'.
src/lib/visual-audit/harness.ts(11,37): error TS2307: Cannot find module 'playwright' or its corresponding type declarations.
Failed to type check.
```

**Tests**: ✅ 451 passed / ❌ 0 failed / ⚠️ 0 skipped
```
Test Files  70 passed (70)
     Tests  451 passed (451)
  Duration  18.97s
```

**Coverage**: ➖ Not executed (build failure prevents coverage run)

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| visual-audit-mode R1 | No env gate means normal mode | `visual-audit.test.ts > IS_VISUAL_AUDIT_MODE is false when PRESETT_VISUAL_AUDIT env is unset` | ✅ COMPLIANT |
| visual-audit-mode R1 | Env gate enables audit mode | `visual-audit.test.ts > AuditModeProvider + useAuditMode provides true when isAuditMode is true` | ✅ COMPLIANT |
| visual-audit-mode R2 | Mutation is denied | (source inspection only — 22 isAuditMode guards across 4 organisms) | ⚠️ PARTIAL |
| visual-audit-mode R2 | Dark theme is forced | `theme-provider.test.tsx` + source inspection (layout.tsx) | ⚠️ PARTIAL |
| visual-audit-mode R3 | Fixtures and time are stable | `visual-audit.test.ts > fixtures have stable timestamps across imports` | ✅ COMPLIANT |
| visual-audit-mode R4 | Valid screenshot workflow runs | (none — harness cannot execute) | ❌ UNTESTED |
| design-tokens R1 | Dark and light tokens are available | (none found) | ❌ UNTESTED |
| design-tokens R1 | Audit mode forces dark tokens | (source inspection only) | ❌ UNTESTED |
| dashboard-page R1 | Dashboard renders in the v2 shell | `Dashboard.test.tsx` (v2 layout assertions) | ✅ COMPLIANT |
| dashboard-page R1 | Dashboard output is deterministic in audit mode | (source inspection — page.tsx L157-164 fixture path) | ⚠️ PARTIAL |
| models-page R1 | Model routing page keeps behavior | `ModelsClient.view.test.tsx` (14 tests) | ✅ COMPLIANT |
| models-page R1 | Audit mode blocks edits | (source inspection — L196,212,230,243 early returns) | ⚠️ PARTIAL |
| profiles-page R1 | Profiles list renders in v2 style | `ProfilesClient.view.test.tsx` (23 tests) | ✅ COMPLIANT |
| profiles-page R1 | Audit mode blocks profile mutations | (source inspection — L145,152,181,195,210,216 early returns) | ⚠️ PARTIAL |
| profiles-page R2 | Empty name is rejected inline | `ProfilesClient.view.test.tsx` | ✅ COMPLIANT |
| profiles-page R2 | Modal actions match the reference | `ProfilesClient.view.test.tsx` | ✅ COMPLIANT |
| backups-page R1 | Backups page loads in v2 style | `BackupsClient.view.test.tsx` (9 tests) | ✅ COMPLIANT |
| backups-page R1 | Audit mode blocks backup mutations | (source inspection — L66,105,124,138,152,168 early returns) | ⚠️ PARTIAL |
| backups-page R2 | Restore does not ask for confirmation | `BackupsClient.view.test.tsx` | ✅ COMPLIANT |
| backups-page R3 | Delete confirmation remains separate from restore | `BackupsClient.view.test.tsx` | ✅ COMPLIANT |
| settings-route R1 | Settings route is reachable | (none found for /settings route) | ❌ UNTESTED |
| settings-route R1 | Old route is no longer primary | (none found) | ❌ UNTESTED |
| settings-route R1 | Audit mode blocks setting changes | (source inspection — L128,141 early returns) | ⚠️ PARTIAL |
| settings-route R2 | Existing controls remain available | `GlobalConfigClient.test.tsx` (12 tests) | ✅ COMPLIANT |
| layout-shell R1 | Shell renders the same structure | `DashboardLayout.test.tsx` (15 tests) | ✅ COMPLIANT |
| layout-shell R1 | No mutation controls are exposed | (source inspection — DashboardLayout.view.tsx L52-53 hides Sync/ThemeToggle) | ⚠️ PARTIAL |
| notification-panel R1 | Panel opens as a floating popover | `DashboardLayout.test.tsx > bell click opens notification panel` | ✅ COMPLIANT |
| notification-panel R1 | Panel overlays without navigating | `DashboardLayout.test.tsx` (Escape/outside click tested) | ✅ COMPLIANT |
| notification-panel R1 | Audit mode blocks notification actions | (source inspection — audit-context.tsx no-op push/resolve/dismiss) | ⚠️ PARTIAL |
| notification-panel R2 | Header label matches the double-bar pattern | (none found) | ❌ UNTESTED |
| notification-panel R3 | Notification item is visually aligned | (none found) | ❌ UNTESTED |

**Compliance summary**: 14/31 scenarios compliant (8 COMPLIANT, 10 PARTIAL-source-inspection-only, 6 UNTESTED, 0 FAILING)

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Env-gated audit mode (server-only) | ✅ Implemented | `process.env.PRESETT_VISUAL_AUDIT === "1"` in `index.ts`, imported only by server components |
| Dark theme forcing | ✅ Implemented | `layout.tsx` adds `dark` class to `<html>`, `ThemeProvider` receives `forcedTheme="dark"`, disables `storageKey` |
| Mutation denial (all surfaces) | ✅ Implemented | 22 `if (isAuditMode) return` guards across ModelsClient(4), ProfilesClient(6), BackupsClient(5), GlobalConfigClient(2), plus `refresh()` return in BackupsClient |
| Fixture data injection | ✅ Implemented | All 4 organisms + Dashboard page short-circuit to `AUDIT_FIXTURE_*` when `isAuditMode` is true |
| Frozen timestamps | ✅ Implemented | `AUDIT_FIXTURE_TIMESTAMP = "2026-01-15T10:30:00.000Z"`, pre-computed relative `AUDIT_FIXTURE_LAST_SYNC` |
| Notification context replacement | ✅ Implemented | `AuditNotificationProvider` provides fixture-only notifications with no-op mutations |
| Normal mode unaffected | ✅ Implemented | `IS_VISUAL_AUDIT_MODE` defaults to `false`; all audit paths gated behind conditional checks |
| Audit-ready signal | ✅ Implemented | `AuditReadySignal` sets `data-audit-ready` on `documentElement` when loading completes |
| Visual harness (screenshot + diff) | ❌ BROKEN | See CRITICAL findings below |
| Reference screenshots committed | ❌ MISSING | `src/lib/visual-audit/references/` is empty |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Server-only env + prop threading (not NEXT_PUBLIC_) | ✅ Yes | `IS_VISUAL_AUDIT_MODE` uses `process.env`, threaded via `AuditModeProvider` |
| Per-component useAuditMode() short-circuit (not global interceptor) | ✅ Yes | Each organism independently reads `useAuditMode()` |
| AuditNotificationProvider (fixture notifs, no-op mutations) | ✅ Yes | Wraps `NotificationProvider` in `DashboardLayoutView` |
| Harness as dev-only Playwright script | ✅ Yes | `harness.ts` is self-contained, never imported by Next.js app |
| ForcedTheme="dark" with storageKey disabled | ✅ Yes | `ThemeProvider` passes `forcedTheme`, skips `storageKey` when forced |
| System theme/localStorage clearing before first paint | ✅ Yes | `<html className="dark">` set server-side before hydration |

### Issues Found

**CRITICAL**:
1. **Build fails with TypeScript errors (exit code 1)**: `visual-audit.test.ts` has 2 TS2769 errors (missing `children` in `createElement(AuditModeProvider, ...)`), and `harness.ts` has TS2307 (`Cannot find module 'playwright'`). Build must exit 0 for verification to pass.
2. **Visual harness cannot produce parity proof — Playwright not installed**: `harness.ts` imports from `playwright` which is not in `package.json` dependencies. The harness is unexecutable.
3. **Harness uses byte-level comparison, not pixel-diff**: `compareImages()` in `harness.ts` compares raw PNG file bytes (L61-84). For different renders of the same layout (PNG encoding differences), this yields false negatives. Real pixel-diff requires `pixelmatch` or `sharp`. This cannot produce valid >=95% similarity evidence.

**WARNING**:
4. **References directory empty — no committed reference PNGs**: `src/lib/visual-audit/references/` contains zero files. The harness auto-saves captures as references when missing (L112-122), returning `similarity: 1, pass: true` — a self-baselining anti-pattern that proves nothing.
5. **Harness captures only 5 routes, not 8 surfaces with states**: `ROUTES` array defines 5 routes (dashboard, models, profiles, backups, settings) — missing notification-panel popover state, Create Profile modal open state, restore toast state, and other scoped states. The owner has 29 reference images suggesting multiple states per surface.
6. **No mapping between owner references and harness routes**: Owner references (29 files in `C:\DEV_PERSON\SCREENSHOT\s-preset\img-v2\`) use a numeric naming scheme (`01.jpg`–`29.jpg`). The harness has no mechanism to map these 29 reference images to specific route/state captures.
7. **AuditNotificationProvider always wraps NotificationProvider**: In `DashboardLayout.view.tsx` L370-375, `AuditNotificationProvider` wraps `NotificationProvider` unconditionally, not only in audit mode. Both contexts are always present. Does not cause behavioral issues but deviates from the conditional-replacement design intent.

**SUGGESTION**:
8. **10 spec scenarios verified only through source inspection**: Mutation-denial scenarios across all 6 client organisms lack runtime test coverage. Unit/integration tests should render organisms with `AuditModeProvider isAuditMode={true}`, attempt mutations, and assert no API calls.
9. **`theme-provider.test.tsx` only has 1 test**: Does not verify `forcedTheme` prop behavior, `storageKey` skip, or `enableSystem` toggle.

### Verdict
**FAIL** — Visual parity proof is the core deliverable of this change (it is named `visual-parity-runtime-proof`), and the two required mechanisms are broken: the build does not pass (TypeScript errors in harness + test files), and the visual harness cannot produce valid parity evidence (Playwright missing, byte-level comparison inadequate for visual diffing, no committed references, no mapping to owner's 29 reference images, and only 5 routes captured vs the 8 surfaces with multiple states required). Source-level implementation of the audit-mode foundation (env gating, dark theme, mutation denial, fixture injection) is correct, but the proof itself — the screenshot capture, comparison metric, and reference mapping — cannot execute.
