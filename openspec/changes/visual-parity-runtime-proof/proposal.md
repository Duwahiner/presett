# Proposal: Visual Parity Runtime Proof

## Intent

The runtime cannot currently prove migrated-route visual parity: the theme follows the OS (light by default), pages load live API data with non-deterministic values, and modal/toast states require real mutations. This change introduces a strictly opt-in, read-only visual-audit mode — activated only through an internal environment variable — that forces the dark reference theme, serves deterministic fixture data, denies mutations, and enables valid reference-viewport screenshot comparison for the eight in-scope surfaces.

## Scope

### In Scope
- Env-var activation gate (`PRESETT_VISUAL_AUDIT=1`); invisible in the normal runtime
- Dark-theme forcing and localStorage/cookie clearing before first paint
- Deterministic in-memory fixture data + frozen timestamps for: Dashboard, Models, Profiles, Backups, Settings
- Read-only adapter at the API service boundary — returns fixture responses, no-ops or 4xx all POST/PUT/DELETE
- Controlled fixture actions for: notification popover, Create Profile modal (read-only render), restore toast (fixture trigger only)
- Reference-viewport screenshot capture + pixel-diff comparison workflow for all eight surfaces

### Out of Scope
- Agents, Permissions, Sync Activity (issues #89–#91)
- Normal user flows, production routes, or any browser-visible toggle/control
- Claiming a parity percentage before measured comparisons exist
- E2E test suite changes beyond the audit harness

## Capabilities

### New Capabilities
- `visual-audit-mode`: opt-in runtime mode (env-var only) that forces dark theme, injects fixture data, denies mutations, and supports screenshot diffing for migrated routes

### Modified Capabilities
- `layout-shell`: must apply forced dark class and clear theme storage when audit mode is active, before hydration
- `design-tokens`: dark reference palette is the locked audit baseline; any divergence is a finding
- `dashboard-page`: server data path must accept fixture injection when audit mode is active
- `models-page`: client data effects must short-circuit to fixtures; mutation controls disabled
- `profiles-page`: client data + Create Profile modal must render from fixture state; all writes denied
- `backups-page`: client data + restore toast must render from fixture trigger; all writes denied
- `settings-route`: GlobalConfigClient must load fixture config; all writes denied
- `notification-panel`: popover must render from fixture notification set; no persistence calls

## Approach

Place an `isVisualAuditMode` flag (derived from `PRESETT_VISUAL_AUDIT`) at the root layout boundary. Override `src/services/api.ts` with an audit adapter that intercepts all requests: reads return fixture JSON, writes return controlled no-ops. Force `class="dark"` on `<html>` and clear `presett-theme` storage before hydration. Supply fixture revisions per route. Drive modal/toast states via harness-only callbacks — never via real API calls. Capture at the reference viewport with fonts loaded and transitions disabled; diff against stored references; report per-route results and exclusions.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/layout.tsx` | Modified | Audit gate + dark class forcing |
| `src/lib/theme-provider.tsx` | Modified | Honor forced dark class in audit mode; skip storage |
| `src/services/api.ts` | Modified | Audit adapter intercept layer |
| `src/app/page.tsx` | Modified | Fixture data source for Dashboard server path |
| `src/components/organisms/ModelsClient/` | Modified | Fixture short-circuit + mutation denial |
| `src/components/organisms/ProfilesClient/` | Modified | Fixture short-circuit + modal read-only + denial |
| `src/components/organisms/BackupsClient/` | Modified | Fixture short-circuit + toast harness + denial |
| `src/components/organisms/GlobalConfigClient/` | Modified | Fixture config + denial |
| `src/lib/visual-audit/` | New | Fixture data, adapter, and harness utilities |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| System theme or persisted cookie invalidates capture | Med | Clear storage + force class before readiness signal |
| Relative timestamps make Dashboard pixels nondeterministic | High | Freeze all timestamps in fixture layer |
| Missing fixture fails silently with empty-state screenshot | Med | Harness fails fast when required fixture not served |
| Audit adapter ships to production | Low | Env-var gate + CI lint rule; adapter tree-shaken in production build |

## Rollback Plan

Delete `src/lib/visual-audit/` and revert the four modified boundaries (`layout.tsx`, `theme-provider.tsx`, `api.ts`, `page.tsx`). The env-var is never set in production, so no user-visible state exists to clean up.

## Dependencies

- `PRESETT_VISUAL_AUDIT` env-var must not be set in CI production jobs or Vercel preview deploys
- Reference screenshots must be captured and committed before comparison runs

## Success Criteria

- [ ] Dark theme is applied before first paint on all eight surfaces with audit mode active
- [ ] All eight surfaces render deterministic fixture data across repeated runs
- [ ] Every POST/PUT/DELETE in audit mode returns a no-op or controlled response — zero real writes
- [ ] Screenshot diff workflow produces per-route pass/fail with pixel-diff evidence
- [ ] Normal runtime behavior is unchanged when `PRESETT_VISUAL_AUDIT` is unset
- [ ] No audit-mode code path is reachable via any normal route, URL, or UI control
