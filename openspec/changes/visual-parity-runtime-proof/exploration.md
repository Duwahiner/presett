## Exploration: visual-parity-runtime-proof

### Current State
The requested 95–100% claim cannot currently be demonstrated by a Chrome headless audit, and no percentage should be invented. The migrated runtime has three independent blockers:

- Theme initialization is delegated to `next-themes` in `src/lib/theme-provider.tsx`. It uses `attribute="class"`, `defaultTheme="system"`, `enableSystem`, and `storageKey="presett-theme"`. The Dashboard therefore follows the browser/OS preference; it does not default to the dark reference. `ThemeToggle` only changes the persisted client preference after hydration.
- Dashboard data is loaded server-side in `src/app/page.tsx` through `getConfig`, `listProfiles`, `listBackups`, and `probeGentleAiVersion`. The page uses `Promise.allSettled`, so an unavailable API produces empty/partial states rather than deterministic reference content. Models and Profiles load live data in client effects; Models additionally requires config, catalog, and profiles. Backups loads `/api/backups`. Settings is `GlobalConfigClient` at `/settings`, also backed by the application API.
- Mutating interaction states are not fixtures: Profiles create/switch/delete/update, Models save/switch/reset/sync, and Backups restore/pin/delete/sync call POST/PUT/DELETE services. Notifications persist in browser storage and toasts are emitted from action handlers. A screenshot audit cannot safely trigger modal/toast states against real data without changing user state.

Existing deterministic mechanisms are test-oriented, not browser-demo-oriented. Vitest tests use component/service mocks and inline fixtures; API route tests use `PRESETT_TEST_*` filesystem overrides and mocked services. The repository has no MSW/Playwright fixture server or documented demo-data mode. `package.json` exposes only Next, Vitest, lint, and build commands.

### Affected Areas
- `src/lib/theme-provider.tsx` — system theme default causes light runtime when the reference is dark; persisted `presett-theme` can also make audits stateful.
- `src/app/layout.tsx` — root provider boundary; the safest audit control must be introduced here or at the browser harness boundary.
- `src/app/page.tsx` — server-side Dashboard aggregation depends on live API and time-relative data.
- `src/components/organisms/ModelsClient/ModelsClient.tsx` — client-side multi-request loading and mutating controls.
- `src/components/organisms/ProfilesClient/ProfilesClient.tsx` — client-side profile/catalog loading plus mutating create/edit/switch/delete flows and modal state.
- `src/components/organisms/BackupsClient/BackupsClient.tsx` — live backup loading and mutating restore/pin/delete/sync flows that produce toast/output states.
- `src/app/settings/page.tsx` and `src/components/organisms/GlobalConfigClient/` — Settings route backed by live configuration.
- `src/services/api.ts` and `src/services/*ApiService.ts` — one live Axios boundary; a read-only deterministic adapter can be placed here without changing production behavior when disabled.
- `src/app/api/**` and `src/app/api/**/__tests__/` — existing environment-overridable filesystem test fixtures prove isolated data sources, but are not currently exposed as a safe visual-audit mode.
- `src/components/**/__tests__/` and `src/components/__tests__/listing-integration.test.tsx` — existing inline mock/fixture patterns can be reused for deterministic component states, but do not produce browser screenshots.

### Approaches
1. **Dedicated read-only visual-audit mode (recommended)** — Add an explicitly opt-in, non-production runtime adapter/harness that returns fixed in-memory responses for only the migrated routes and exposes deterministic state controls (dark theme, fixed timestamps, populated records). Keep it disabled unless a clearly named test/audit environment flag is present, reject mutating requests in that mode, and drive modal/toast visuals through test-only callbacks or route-level harness controls rather than real mutations.
   - Pros: smallest production-safe change; exercises the real route/layout/components; deterministic across runs; proves the requested scope without touching user files or APIs.
   - Cons: requires a browser test runner or small harness and careful exclusion from production deployments; Dashboard server rendering needs an explicit audit data source as well.
   - Effort: Medium

2. **Pure component screenshot harness with mocked service modules** — Render each view with existing Vitest-style mocks/fixtures and capture screenshots using a browser-capable test setup.
   - Pros: no application data access; highly deterministic; ideal for modal/toast edge states.
   - Cons: does not prove the actual Next route/provider/server-data composition; cannot independently validate Dashboard's server aggregation or navigation shell parity.
   - Effort: Medium

3. **Seed an isolated local backend/filesystem and use normal runtime** — Populate temporary config, model cache, and backup directories via the existing `PRESETT_TEST_*` conventions, run the app against that isolated data, and intercept only unsafe mutation endpoints.
   - Pros: closest to normal API behavior; reuses existing route architecture.
   - Cons: larger and more brittle; the browser still needs deterministic theme/time controls and safe modal/toast triggering; accidental writes remain a risk unless every mutation is blocked.
   - Effort: High

### Recommendation
Use Approach 1, supplemented by component-level fixtures for modal/toast states. The smallest remediation is not a visual CSS change: it is a test-only, opt-in read-only runtime contract plus a browser screenshot harness. Set the audit theme explicitly to dark before capture, provide fixed records/timestamps for Dashboard, Models, Profiles, Backups, and Settings, and make all mutation endpoints no-op or return controlled success without persistence. Render modal/toast states from deterministic harness actions or directly supplied view props, never by issuing real destructive requests.

Validation must be evidence-based and scoped only to migrated routes/states. Capture at the exact reference viewport and device scale, with fonts loaded and animations/transitions disabled. For each route, record the fixture revision, theme, viewport, URL, and state; compare screenshots against the matching reference using a documented pixel-diff/overlay process. Report per-route and per-state results, changed regions, and exclusions. Only claim 95–100% if the measured comparison and owner-approved tolerance support it; otherwise report the measured result or “not demonstrated.” A passing unit/build suite is supporting evidence, not visual parity proof.

### Risks
- A `system` theme or persisted `presett-theme` can silently invalidate captures; audit setup must clear storage and set the class before screenshot readiness.
- Relative time and live version/config values make Dashboard pixels nondeterministic; fixtures must freeze timestamps and optional version text.
- API fallback empty states can look like valid screenshots while hiding missing data; the harness must fail fast when a required fixture is not served.
- Modal/toast captures can accidentally call production mutation endpoints; network-level denylisting plus read-only adapters are required.
- A mock-only harness can overstate confidence by bypassing route composition; include at least one real Next runtime capture per migrated route.

### Ready for Proposal
Yes. Tell the proposal phase to define an opt-in read-only visual-audit contract, deterministic dark-theme initialization, frozen fixture data for the five migrated routes, mutation denial, and screenshot/diff acceptance evidence. Do not promise a parity percentage until the captures and measured comparisons exist.
