# Tasks: Visual Parity Runtime Proof

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350 lines |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Infrastructure) → PR 2 (Component Injection) → PR 3 (Testing Harness) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Foundation (Ctx, Adapter, Fixtures) | PR 1 | `vitest lib/visual-audit` | N/A (lib only) | Delete `src/lib/visual-audit` |
| 2 | Component Injection (Client/Shell/Page) | PR 2 | `vitest components/organisms` | `PRESETT_VISUAL_AUDIT=1 npm run dev` | Revert modifications in PR 2 files |
| 3 | Testing/Harness (Capture/Diffing) | PR 3 | `npx playwright test visual-audit` | Playwright diffing | Delete harness files |

## Phase 1: Infrastructure (Foundation)

- [x] 1.1 Create `src/lib/visual-audit/index.ts` with `IS_VISUAL_AUDIT_MODE` server-only check
- [x] 1.2 Create `src/lib/visual-audit/fixtures.ts` with frozen timestamps and typed fixture constants
- [x] 1.3 Create `src/lib/visual-audit/audit-context.tsx` with `AuditModeProvider` and `useAuditMode()` hook
- [x] 1.4 Create `src/lib/visual-audit/audit-notification-provider.tsx` for mutation-safe fixture-only notification shell
- [x] 1.5 Unit Test: Assert `IS_VISUAL_AUDIT_MODE` is disabled by default

## Phase 2: Component Injection (Core)

- [x] 2.1 Modify `src/app/layout.tsx`: Force dark theme + apply `AuditModeProvider`
- [x] 2.2 Modify `src/lib/theme-provider.tsx`: Add `forcedTheme` support to `ThemeProvider`
- [x] 2.3 Modify `src/app/page.tsx`: Inject fixtures in `Dashboard` when audit mode active
- [x] 2.4 Modify `ModelsClient`, `ProfilesClient`, `BackupsClient`, `GlobalConfigClient`: Short-circuit data + deny writes

## Phase 3: Integration (Wiring)

- [x] 3.1 Modify `DashboardLayout.view.tsx`: Hide controls and wire `AuditNotificationProvider`
- [x] 3.2 Create `src/lib/visual-audit/audit-ready-signal.tsx`: Emits `data-audit-ready` on hydration completion
- [x] 3.3 Verify: Audit mode correctly forces dark theme and mutation denial on all eight surfaces

## Phase 4: Testing & Verification (Harness)

- [x] 4.1 Create `src/lib/visual-audit/harness.ts` with Playwright viewport 1478×968 and pixel-diffing (>=95% similarity)
- [x] 4.2 Record reference screenshots for all eight surfaces using `harness.ts`
- [x] 4.3 Verify: Harness fails correctly if similarity threshold drops below 95%
- [x] 4.4 Documentation: Update README with audit mode activation instructions (`PRESETT_VISUAL_AUDIT=1`)
