# Design: PreSett Fase 1 MVP

Answers proposal `openspec/changes/fase-1-mvp/proposal.md` and spec `openspec/changes/fase-1-mvp/specs/default/spec.md`.

## D1. Framework & language

Next.js 16 (App Router) + React 19 + TypeScript (strict). All API routes run on the Node.js runtime (filesystem access; no edge).

## D2. Styling

Tailwind CSS v4, dark mode default, Gentle-AI rose/neon accent palette. Phase 1 pages: Dashboard, Models, Profiles, Backups. Shared UI primitives: `StatusCard`, `AgentAssignmentRow`, `ModelPicker` (provider → model → variant cascade), `ConfirmDialog`, `ErrorBanner`, `EmptyState`.

## D3. Testing

Vitest + @testing-library/react + happy-dom. Unit: validators, adapter parse/serialize/atomic-write, backup naming. Integration: read/write flows against fixture config files in a temp dir (never against the user's real `~/.config` during tests). No E2E in Phase 1 (deferred). Strict TDD is enabled; every production change is preceded by a failing test.

## D4. Directory structure

```
presett/
├── package.json, next.config.ts, tsconfig.json, vitest.config.ts, tailwind config
├── proxy.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx, page.tsx (Dashboard)
│   │   ├── models/page.tsx, profiles/page.tsx, backups/page.tsx
│   │   └── api/
│   │       ├── status/route.ts            # GET dashboard state
│   │       ├── models/route.ts            # GET catalog from model-variants cache
│   │       ├── config/route.ts            # GET current assignments / PUT validated change
│   │       ├── profiles/route.ts          # GET list / POST create
│   │       ├── profiles/[name]/route.ts   # PUT edit / DELETE
│   │       ├── profiles/[name]/switch/route.ts  # POST activate
│   │       ├── backups/route.ts           # GET read-only list
│   │       └── sync/route.ts              # POST run `gentle-ai sync`
│   ├── components/ (atoms/, molecules/, organisms/)
│   ├── adapters/                          # external config adapters
│   │   └── opencode.ts                    # read/write opencode.json
│   ├── services/                          # file/cache readers and process runners
│   │   ├── stateService.ts                # read state.json
│   │   ├── modelCacheService.ts           # read model-variants.json
│   │   ├── backupsService.ts              # read gentle-ai backup manifests
│   │   └── processService.ts              # spawn gentle-ai sync
│   ├── lib/                               # shared domain logic
│   │   ├── preWriteBackup.ts              # PreSett-owned backup copies
│   │   ├── validators.ts                  # Zod schemas + model/variant validation
│   │   ├── paths.ts                       # baseDir-injectable path resolvers
│   │   └── types.ts                       # shared Result<T,E> and domain types
│   └── types/                             # public type modules (agent, opencode, state)
```

## D5. Config I/O contracts

- `opencode.json`: full `JSON.parse` → mutate known fields only → `JSON.stringify(..., null, 2)`. Object round-trip preserves unknown keys (spec Cap.1 requirement). Key insertion order preserved.
- Atomic write (spec Cap.7): write `opencode.json.presett-tmp` in the same directory, then `fs.rename` over the target. Same-directory rename is atomic on the same volume.
- Pre-write backup location: `~/.presett/backups/{yyyyMMdd-HHmmss}__opencode.json` — PreSett-owned, OUTSIDE `~/.gentle-ai/backups/` (decision D1 read-only). Directory auto-created. Retention: keep last 20 PreSett backups.
- All readers return `Result<T, ConfigError>` with typed errors: `FILE_MISSING`, `PARSE_FAILED`, `SCHEMA_INVALID`, `WRITE_BLOCKED`. API routes map these to HTTP 4xx/5xx with machine-readable codes; UI renders `ErrorBanner` from them.

## D6. Validation pipeline (write path)

1. Zod schema check of the mutated `opencode.json` structure.
2. Model/variant validation against `model-variants` cache (provider exists, model exists, variant in list). Cache missing → `WRITE_BLOCKED` error (spec Cap.3).
3. Pre-write backup → atomic write → re-read + parse verification.

## D7. Profile switching

Profiles exist as agent entries in `opencode.json` (`sdd-orchestrator-{name}`, `sdd-{phase}-{name}`). Switching a profile sets `opencode.json.default_agent` to that profile's orchestrator agent. The `.gentle-ai-default-agent.json` marker in `~/.config/opencode/` is read-only for PreSett (exploration #41); PreSett does not modify gentle-ai internal markers.

## D8. Sync

`child_process.spawn("gentle-ai", ["sync"])` with 120s timeout; capture stdout/stderr/exit code; POST `/api/sync` returns them. No retry, no reimplementation (decision D2).

## D9. Security posture

Localhost-only, no auth (per proposal). API routes bind to loopback via Next.js defaults; documented in README.

## Open risks carried to apply

- Profile-switch semantics may need adjustment if gentle-ai uses a mechanism beyond `default_agent`.
- `model-variants` cache absence on machines where OpenCode never started (handled by `WRITE_BLOCKED` path).
- Greenfield size: ~1700 estimated changed lines across 4 slices → exceeds 400-line review budget → chained/stacked delivery already decided (stacked-to-main).
