# Design: Global Gentle-AI and OpenCode Configuration

## Technical Approach

Extend the existing `/api/config` route with a PATCH handler for domain-scoped global preference writes, and update GET to aggregate `gentleAi` fields alongside the existing `{ defaultAgent, assignments }` response (additive — no breaking change). A new `src/adapters/gentle-ai.ts` mirrors the `writeOpenCodeConfig` atomic-write guarantee (backup → tmp write → rename → re-read verify) for `state.json`. Validation uses a Zod discriminated union on `domain`; the `opencode` branch is an allowlist-only schema — no `.passthrough()`. A new `/config` page renders a `GlobalConfigClient` organism with two independent save sections. `language` is modeled as `Locale = "es" | "en"`; when absent from `state.json`, the UI derives the default from the browser locale (`es-*` → `"es"`, anything else → `"en"`) — the file is created or modified only after an explicit Save. `/config` is always visible in the main nav, unconditionally.

## Architecture Decisions

| Decision | Options | Choice | Rationale |
|----------|---------|--------|-----------|
| Route | New `/api/global-config` vs extend `/api/config` | Extend `/api/config` with PATCH | Proposal specifies this file; additive GET preserves backward compat with existing consumers |
| Gentle-AI writes | Extend `stateService` vs new adapter | New `src/adapters/gentle-ai.ts` | Keeps `stateService` read-only; mirrors the adapter/service split already established in the codebase |
| PATCH schema | Unconstrained body vs discriminated union | `{ domain: "gentle-ai" | "opencode" }` union | Enforces single-domain writes at schema level; prevents accidental cross-domain mutation |
| OpenCode PATCH allowlist | Reuse `.passthrough()` schema vs explicit allowlist | Allowlist: `agentKey`, `model`, `variant` only | Closes the `.passthrough()` risk flagged in the proposal; rejects unknown fields with 400 |
| Gentle-AI write guarantee | Simple `writeFile` vs atomic rename + backup | Atomic rename + backup (same as `writeOpenCodeConfig`) | Matches existing project write contract; `state.json` holds critical preset state |
| `language` type | `string` (open) vs `Locale = "es" \| "en"` | `Locale = "es" \| "en"` | `state.json` and fixtures lack a `language` field; constraining to known locales prevents invalid values and matches the two supported UI languages |
| `language` default (field absent) | Hard-coded `"en"` vs browser-locale detection | Browser-locale: `es-*` → `"es"`, else → `"en"` | `state.json` not present means personal config was never saved; deriving from browser locale gives the most relevant default without inspecting personal config |
| `language` write timing | Write on detect vs write on Save | Write only on explicit Save | Avoids creating/modifying `state.json` from a passive page load; user retains full control over when the file is touched |
| `/config` nav visibility | Conditional (files detected) vs always shown | Always shown (unconditional) | Product decision Q4=A: the config surface is a first-class feature, not a developer escape hatch — hiding it degrades discoverability without safety benefit |

## Data Flow

```
GET /api/config (updated — additive)
  readOpenCodeConfigSafe  ──→  defaultAgent, assignments[]  ─┐
  readStateJsonSafe       ──→  persona, language            ─┴──→ { defaultAgent, assignments[], gentleAi: { persona?, language? } }
  (state.json absent)     ──→  gentleAi: {}  (language field missing → UI derives from navigator.language: es-* → "es", else → "en"; no file created)

PATCH /api/config (new handler)
  requireMutationOrigin (existing security guard)
  globalConfigPatchSchema.safeParse(body)
  │  invalid ──→ 400 + field-level errors, no file touched
  ├─ domain="gentle-ai" → readStateJsonSafe → merge → writeGentleAiConfig
  └─ domain="opencode"  → readOpenCodeConfigSafe → merge → writeOpenCodeConfig (existing)
  success ──→ { ok: true }

/config page (RSC shell)
  └─ GlobalConfigClient ("use client")
      ├─ useEffect → getGlobalConfig() → populate form state
      ├─ GentleAi section: language + persona → Save → patchGlobalConfig("gentle-ai", {...})
      └─ OpenCode section: model + variant for default_agent → Save → patchGlobalConfig("opencode", {...})
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/adapters/gentle-ai.ts` | Create | `readGentleAiConfigSafe`, `writeGentleAiConfig` (backup + tmp rename + re-read verify) |
| `src/types/state.ts` | Modify | Add `language?: Locale` to `StateJson`; define `type Locale = "es" \| "en"` |
| `src/lib/validators.ts` | Modify | Add `globalConfigPatchSchema` (discriminated union), `gentleAiPatchSchema`, `openCodeGlobalPatchSchema` (allowlist) |
| `src/app/api/config/route.ts` | Modify | Update GET (add `gentleAi` field, additive); add PATCH handler |
| `src/app/config/page.tsx` | Create | RSC shell for `/config` route; renders `GlobalConfigClient` |
| `src/components/organisms/GlobalConfigClient/GlobalConfigClient.tsx` | Create | Container: fetch, state, save handlers, error dispatch |
| `src/components/organisms/GlobalConfigClient/GlobalConfigClient.view.tsx` | Create | View: two form sections, independent Save buttons, `ErrorBanner` reuse |
| `src/components/organisms/GlobalConfigClient/GlobalConfigClient.types.ts` | Create | Props and state shape types |
| `src/services/globalConfigApiService.ts` | Create | `getGlobalConfig()`, `patchGlobalConfig(domain, payload)` — mirrors `modelsApiService` pattern |

## Interfaces / Contracts

```ts
// Shared locale type (defined in src/types/state.ts)
type Locale = "es" | "en";

// PATCH /api/config body
type GlobalConfigPatch =
  | { domain: "gentle-ai"; language?: Locale; persona?: string }
  | { domain: "opencode"; agentKey: string; model: string; variant: string };

// GET /api/config response (additive — assignments[] and defaultAgent retained)
interface GlobalConfigGetResponse {
  defaultAgent?: string;
  assignments: ModelAssignment[];
  gentleAi: { persona?: string; language?: Locale };
}

// Client-side language resolution (GlobalConfigClient, no server involvement)
function resolveDisplayLocale(language: Locale | undefined): Locale {
  if (language !== undefined) return language;
  return navigator.language.startsWith("es") ? "es" : "en";
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `globalConfigPatchSchema`: valid union members accepted; unknown fields and invalid locales rejected | Vitest, no fs |
| Unit | `writeGentleAiConfig`: backup created → rename succeeds → re-read verifies | Vitest + `mkdtemp`, mirrors `opencode-write.test.ts` |
| Unit | `resolveDisplayLocale`: `undefined` + `navigator.language = "es-AR"` → `"es"`; `undefined` + `"fr-FR"` → `"en"`; explicit `"en"` → `"en"` | Vitest, mock `navigator.language` |
| Integration | PATCH `gentle-ai` valid → `state.json` mutated; invalid locale → 400, no mutation | env var `PRESETT_TEST_GENTLE_AI_DIR` injection |
| Integration | PATCH `opencode` valid → `opencode.json` mutated; invalid → no mutation | env var `PRESETT_TEST_CONFIG_DIR` injection |
| Integration | GET when `state.json` absent → 200 with `gentleAi: {}` (no `language` key) | env var injection, no file pre-created |
| Integration | PATCH error response → no file paths or internal metadata in body | inspect sanitized error shape |

## Threat Matrix

N/A — no routing, shell commands, subprocesses, VCS/PR automation, executable-file classification, or process-integration boundary introduced by this change.

## Migration / Rollout

No migration required. `language?: Locale` is optional in `StateJson`; existing `state.json` files without the field continue to work — the UI derives the display locale from `navigator.language` and the file is not rewritten until the user saves. The `opencode.json` structure is not restructured. GET response is additive — existing callers (ModelsClient, tests) remain unaffected. `/config` nav entry added unconditionally. Rollback: remove PATCH handler, revert GET additions, delete `/config` page, `GlobalConfigClient`, and nav entry.

## Open Questions

_No blocking open questions remain._

**Resolved — 2026-08-13:**

| # | Question | Resolution |
|---|----------|------------|
| Q1 | Does `state.json` already have a `language` field? | No. `StateJson` and all fixtures lack `language`. Model as `language?: Locale`; UI derives default from `navigator.language` on first load (no file write). |
| Q2 | Should `/config` nav be conditional on detected files? | No. Product decision Q4=A: always visible in main nav, unconditionally. |
