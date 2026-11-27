# Design: profile-base-detail-hydration

## Technical Approach

Add a static Next.js route `GET /api/profiles/base` that invokes a new adapter function `getBaseProfileDetail`. Alias the service layer so `getProfileDetail("")` routes to `/profiles/base`. Guard "base" as reserved name in `createProfile`. The named-profile contract (`[name]/route.ts`, `getProfileDetail`) remains untouched.

## Architecture Decisions

| Decision | Option | Tradeoff | Choice |
|----------|--------|----------|--------|
| Route boundary | New static `base/route.ts` vs. middleware rewrite vs. detect "base" inside `[name]` | Static = zero ambiguity, isolated rollback, Next.js resolves static before dynamic automatically | **New static file** |
| Adapter surface | New `getBaseProfileDetail(config)` vs. modify `getProfileDetail` to accept `""` | `getProfileDetail` requires `sdd-orchestrator-${name}` key; Base uses `gentle-orchestrator` — different key convention; separate function avoids coupling | **New `getBaseProfileDetail`** |
| Alias location | Service layer vs. client `handleEditStart` | Service owns URL construction; client shouldn't hardcode route heuristics | **`profilesApiService.getProfileDetail`** |
| Reserved-name guard | Guard "base" in `createProfile` adapter | Without guard, a named profile "base" (`PUT /api/profiles/base`) reaches `[name]` via PUT (static only covers GET) causing silent conflict | **Add "base" to denylist in `createProfile`** |

## Data Flow

```
handleEditStart(name="") [profilesClient.tsx]
  └── getProfileDetail("") [profilesApiService.ts]
        └── name === "" → GET /api/profiles/base [HTTP]
              └── base/route.ts GET handler
                    ├── readOpenCodeConfigSafe(configDir)
                    └── getBaseProfileDetail(config) [opencode.ts]
                          ├── iterate config.agent entries
                          ├── keep where isProfileAgent(key) === null
                          │     (captures "gentle-orchestrator" and non-profile agents)
                          └── return { name: "", assignments: { "gentle-orchestrator": {...} } }
        └── setEditAssignments({ "gentle-orchestrator": {...} })

Named profile path (unchanged):
handleEditStart(name="custom")
  └── getProfileDetail("custom") → GET /api/profiles/custom → [name]/route.ts (no change)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/app/api/profiles/base/route.ts` | Create | Static `GET` handler; calls `getBaseProfileDetail`; exports `OPTIONS` |
| `src/adapters/opencode.ts` | Modify | Add `getBaseProfileDetail(config): ProfileDetail`; add "base" to `createProfile` denylist |
| `src/services/profilesApiService.ts` | Modify | `getProfileDetail`: if `name === ""` call `get("/profiles/base")` |
| `src/app/api/profiles/base/__tests__/route.test.ts` | Create | Contract tests for `GET /base` |
| `src/adapters/__tests__/profiles.test.ts` | Modify | Add Base detail cases; reserved name guard for "base" |
| `src/services/__tests__/profilesApiService.test.ts` | Modify | Empty-name alias test |
| `src/components/organisms/ProfilesClient/__tests__/profilesClient.test.tsx` | Modify | Base hydration scenario |

## Interfaces / Contracts

```typescript
// opencode.ts — new export
export function getBaseProfileDetail(config: OpenCodeConfig): ProfileDetail {
  const assignments: Record<string, ProfileDetailAssignment> = {};
  for (const [agentKey, entry] of Object.entries(config.agent)) {
    if (isProfileAgent(agentKey) === null && typeof entry.model === "string") {
      const { provider, model } = splitModelRef(entry.model);
      assignments[agentKey] = { provider, model, variant: entry.variant ?? "" };
    }
  }
  return { name: "", assignments };
}

// profilesApiService.ts — modified
export async function getProfileDetail(name: string): Promise<ProfileDetail> {
  const segment = name === "" ? "base" : encodeURIComponent(name);
  return get(`/profiles/${segment}`);
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Adapter unit | `getBaseProfileDetail` collects `gentle-orchestrator` and non-profile agents; excludes named-profile agents; returns `name: ""` | Pure function, no FS, config fixture |
| Adapter unit | `createProfile` rejects name `"base"` with `SCHEMA_INVALID` | Existing pattern in `profiles.test.ts` |
| Route integration | `GET /api/profiles/base` → 200 with assignments; distinct from list route | `tmpdir` fixture, env override pattern from `[name]/route.test.ts` |
| Route integration | `GET /api/profiles/base` → 404 when config missing | Same fixture, no `opencode.json` |
| Service unit | `getProfileDetail("")` calls `/profiles/base`, not `/profiles/` | Mock `get`, assert segment |
| Client integration | `handleEditStart("")` sets `editAssignments` with `gentle-orchestrator` | MSW/mock service, existing `profilesClient.test.tsx` pattern |
| Client integration | Named profiles unaffected after Base hydration | Assert existing profiles state |

## Threat Matrix

This change adds an HTTP routing boundary (`GET /api/profiles/base`).

| Boundary | Adversarial cases | Applicability | Design response | RED tests |
|----------|------------------|---------------|-----------------|-----------|
| Documentation-like paths | `requirements.txt`, executable MDX | N/A — no file classification in this change | — | — |
| Git repository selection | `git -C`, relative paths | N/A — no VCS operations | — | — |
| Commit state | staged, `commit -a`, empty index | N/A — no git operations | — | — |
| Push state | tracking branch, first push | N/A — no push operations | — | — |
| PR commands | `--head`, environment prefix | N/A — no PR automation | — | — |
| **Reserved route conflict** | User creates profile named "base"; `PUT /api/profiles/base` reaches dynamic `[name]` handler | **Applicable** — static `base/route.ts` only covers `GET`; named-profile `PUT`/`DELETE` methods reach `[name]` unguarded | Reject "base" in `createProfile` adapter denylist; log reserved names in API docs | RED: `createProfile(…, "base", …)` returns `SCHEMA_INVALID` |

## Migration / Rollout

No migration required. No data schema changes. `gentle-orchestrator` already persists under its key in `opencode.json`. Rollback: delete `base/route.ts` and revert alias in `profilesApiService.ts`.

## Open Questions

- [ ] **PUT path for Base**: `handleEditSave` calls `updateProfile(editingProfile="", editAssignments)` → service calls `put("/profiles/")` → broken. Is saving Base in scope for this change? The proposal only mentions GET and hydration. If yes, requires `PUT /api/profiles/base` + `updateBaseProfile` adapter function (currently `updateProfile` rejects `name === ""`). If no, the Save button must be disabled for Base until a follow-up change addresses it.
