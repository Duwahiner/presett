# Proposal: Global Gentle-AI and OpenCode Configuration

## Intent

PreSett has no unified UI surface to view or edit global Gentle-AI preferences or general OpenCode options. Users must hand-edit config files, risking invalid values, data loss, and secret exposure. This change introduces a dedicated `/config` page with validated, domain-separated save operations for the two confirmed preference sets.

## Scope

### In Scope
- New `/config` (or `/settings`) route in the primary nav — Gentle-AI section + OpenCode section
- **Gentle-AI fields**: active response language, active persona
- **OpenCode fields**: active model (already read/written today)
- Independent "Save" button per section (no cross-domain atomic save)
- Defaults shown on first visit; if config file absent, create it only on explicit Save
- Field-level validation before any write; no file mutation on invalid payload
- Safe API error responses — no file paths or secrets exposed
- TDD coverage: validation, no-mutation-on-error, backup, safe presentation

### Out of Scope
- Any Gentle-AI or OpenCode field not already read/written by PreSett today (requires explicit case-by-case approval before adding)
- Secrets, tokens, or local-path fields
- Cross-domain atomic save / rollback-on-second-failure
- Bulk import/export of config files

## Capabilities

### New Capabilities
- `global-config-page`: `/config` route with Gentle-AI and OpenCode sections, independent save buttons, validated fields, safe error display

### Modified Capabilities
- `opencode-adapter`: extend to expose active model in the config surface (already writable; needs API contract alignment)

## Approach

Unified surface with domain-separated adapters (Approach 1 from exploration). A new API route `GET/PATCH /api/config` aggregates readable preferences from both domains; each PATCH targets a single domain (`domain: "gentle-ai" | "opencode"`). Reuse `writeOpenCodeConfig` (atomic rename + backup + re-read) for OpenCode. Define an equivalent write guarantee for Gentle-AI state. Validate full payload before any write; return field-level errors on failure without touching files.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/config/route.ts` | Modified | Add GET (aggregate) + PATCH (domain-scoped) handlers |
| `src/adapters/opencode.ts` | Modified | Expose active model read path for config surface |
| `src/adapters/gentle-ai.ts` | New | Read/write response language and active persona |
| `src/lib/validators.ts` | Modified | Add Zod schemas for the three editable fields |
| `src/app/config/page.tsx` | New | `/config` page with two independent sections |
| `src/components/organisms/` | New | `GentleAiConfigForm`, `OpenCodeConfigForm` organisms |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Gentle-AI state file absent on first visit | Med | Show defaults + banner; create file only on Save |
| `.passthrough()` on OpenCodeConfig allows unsafe fields | Med | Allowlist only the three confirmed fields in PATCH schema |
| API error leaks internal path metadata | Low | Sanitize error objects in all config route handlers |
| Scope creep from future field requests | Med | Q5=B policy: new fields require explicit approval before spec |

## Rollback Plan

Revert `src/app/api/config/route.ts` to previous contract, remove `src/app/config/` page and new organisms, restore `src/lib/validators.ts` to prior schema. No data migration needed — existing config files are not restructured.

## Dependencies

- Exploration artifact: `openspec/changes/global-gentle-ai-opencode-config/exploration.md`
- GitHub issue #52
- Existing `writeOpenCodeConfig` atomic write guarantee in `src/adapters/opencode.ts`

## Success Criteria

- [ ] `/config` page accessible from primary nav with both sections rendered
- [ ] Saving Gentle-AI section updates only the Gentle-AI state file; saving OpenCode section updates only `opencode.json`
- [ ] Invalid field value → field-level error displayed, no file written
- [ ] Config absent on first load → defaults shown with informational banner; no file created
- [ ] API responses contain no file paths or secrets
- [ ] Vitest coverage: validation, no-mutation-on-error, backup, safe error presentation
