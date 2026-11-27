# Proposal: Sectioned Profile Creation Form

## Intent

`CreateProfilePanel` exposes only the orchestrator selector; `handleCreate` already builds all `sdd-{phase}-{profile}` assignments when present, but the UI never lets the user fill them in. Users create profiles with a single model, then have to edit phase-by-phase or hand-edit the config. The change surfaces all 10 SDD phases inside the creation form, grouped by workflow stage, with an affordance to propagate the orchestrator selection to every phase in one click.

## Scope

### In Scope
- Replace the single-assignment panel with a four-section form (Orchestrator · Planning · Design & Execution · Closure & Support)
- Each section lists its phases with individual provider/model/variant selectors
- "Copy to all" action per section that propagates the current orchestrator assignment to every phase in that section
- Variant selector is optional: hidden when the selected model has no variants in the catalog
- Existing `handleCreate` logic and `sdd-{phase}-{profile}` key contract are untouched

### Out of Scope
- Editing form (separate change `profile-edit-hydration`)
- Bulk assignment across sections at once
- Adding new phases to `SDD_PHASES`
- Any API or adapter changes

## Capabilities

### New Capabilities
- `sectioned-profile-form`: Multi-section creation panel with per-phase model selectors, grouped by workflow stage, and orchestrator-propagation action

### Modified Capabilities
- None

## Approach

Extract `CreateProfilePanel` into a stateless presentational component that receives `newAssignments` and `onAssignmentChange` from the parent (`ProfilesClient`) — same props already wired. Replace the single orchestrator block with four `<SectionBlock>` renders, each mapping over its phase list. Add a `handleCopyOrchestratorToSection(phases)` helper in `ProfilesClient` that sets `newAssignments[phase]` to the current orchestrator value for each phase in the array. Variant field renders conditionally: shown only when `catalog[provider]?.[model]?.length > 0`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/organisms/ProfilesClient/createProfilePanel.tsx` | Modified | Replace single-assignment block with four section blocks |
| `src/components/organisms/ProfilesClient/profilesClient.tsx` | Modified | Add `handleCopyOrchestratorToSection` helper; pass section config to panel |
| `src/components/organisms/ProfilesClient/profilesClientView.tsx` | Modified | Forward new props to `CreateProfilePanel` if needed |
| `src/resources/resources.ts` (i18n) | Modified | Add keys for section titles and copy-action labels |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Panel too tall, UX degraded on small screens | Med | Sections collapsed by default; Orchestrator always expanded |
| Variant field confusion when absent | Low | Hide variant entirely when `variants.length === 0` |
| `handleCreate` sends empty assignments for unconfigured phases | Low | Existing guard `newAssignments[phase]?.provider` already skips them |

## Rollback Plan

`CreateProfilePanel` is a leaf component. Reverting to the single-assignment version requires reverting `createProfilePanel.tsx` only. The `handleCreate` logic and API contract are unchanged.

## Dependencies

- None — catalog already available in `ProfilesClient` state; `SDD_PHASES` already defined

## Success Criteria

- [ ] Creating a profile with all phases filled produces `sdd-orchestrator-{name}` + 10 `sdd-{phase}-{name}` entries in `opencode.json`
- [ ] "Copy to all" in a section fills all its phase selectors with the orchestrator values
- [ ] Creating a profile with only the orchestrator filled still works (phases optional)
- [ ] Variant selector is absent when the model has no variants in the catalog
- [ ] Existing `createProfilePanel.test.tsx` suite passes; new tests cover section propagation
