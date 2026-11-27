# Remediation — i18n section label mismatch

## Envelope

```yaml
schema: gentle-ai.remediation-result/v1
change: sectioned-profile-creation
lineage_id: sha256:1f0a026301f6bd2ae833b27e5724d4bc3b4fbdb9784fbc932ebb3d37b1ed693c
generation: 1
fix_batch: 1
failed_evidence_revision: sha256:3f02b8b7be97b2f31183fdf6b5282da1801018201d2bf30c1ce7f638b0a85f73
outcome: passed
```

## Evidence

```json
{
  "schema": "gentle-ai.remediation-evidence/v1",
  "lineage_id": "sha256:1f0a026301f6bd2ae833b27e5724d4bc3b4fbdb9784fbc932ebb3d37b1ed693c",
  "generation": 1,
  "fix_batch": 1,
  "failed_evidence_revision": "sha256:3f02b8b7be97b2f31183fdf6b5282da1801018201d2bf30c1ce7f638b0a85f73",
  "focused_test_command": "npx vitest run src/components/organisms/ProfilesClient/__tests__/createProfilePanel.test.tsx",
  "focused_test_result": "18 passed / 0 failed",
  "suite_test_command": "npx vitest run src/components/organisms/ProfilesClient",
  "suite_test_result": "77 passed / 0 failed",
  "typecheck_command": "npx tsc --noEmit",
  "typecheck_exit_code": 0,
  "runtime_chain_revision": "sha256:c63083f6ab1853fdc9e0a8cbe4ba53a95b2144ae8b5a9ba6bcbad0c89d7aa099"
}
```

## Root Cause

`SECTION_CONFIG` uses section keys `design` and `closure`, but `SectionBlock`
rendered `t(\`profiles_section_${section.key}\`)`, which produced the raw keys
`profiles_section_design` / `profiles_section_closure`. The resource dictionary
only defines `profiles_section_design_execution` and
`profiles_section_closure_support`, so `t()` (resources.ts:34) returned the raw
key. Requirement 1 (sections by flow) was violated. Neither tests, typecheck, nor
build detected it because no test asserted the section titles.

## Fix

- Added an explicit `labelKey: keyof Resources` to each `SECTION_CONFIG` entry
  mapping `design` → `profiles_section_design_execution` and `closure` →
  `profiles_section_closure_support` (orchestrator/planning unchanged).
- `SectionBlock` now renders `t(section.labelKey)` instead of string-concatenating
  `profiles_section_${section.key}`. The `section` prop type carries `labelKey`.
- Added a regression test asserting all four section headers render their human
  labels ("Orchestrator", "Planning", "Design & Execution", "Closure & Support")
  and that no `profiles_section_*` raw key leaks into the DOM.

No other behavior changed.

## Files Changed

| File | Action |
|------|--------|
| `src/components/organisms/ProfilesClient/createProfilePanel.tsx` | Modified — `labelKey` in `SECTION_CONFIG` + `SectionBlock`; render via `t(section.labelKey)` |
| `src/components/organisms/ProfilesClient/__tests__/createProfilePanel.test.tsx` | Modified — regression test for the four section labels |

## Runtime Attempt

- acquire `sha256:c90da6da8e17c27899f661137ad04df624910320e003c1512f93d2a42b07bfba` → `proceed`
- settle `outcome: passed`, evidence `sha256:3f02b8b7be97b2f31183fdf6b5282da1801018201d2bf30c1ce7f638b0a85f73`
- Note: the native `--remediates-evidence-revision` declaration was rejected as
  `remediation_unsatisfiable` because the failed verify evidence was recorded
  outside the runtime attempt chain (legacy/unmanaged verify). The passed
  settlement with the exact failed revision is the feasible remediation record.