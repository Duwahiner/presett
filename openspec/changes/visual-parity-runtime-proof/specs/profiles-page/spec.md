# Delta for profiles-page

## MODIFIED Requirements

### Requirement: Profiles page adopts the v2 reskin

The system MUST restyle `/profiles` with the v2 tokens and brutalist layout while preserving existing profile management behavior.
In visual audit mode, profile screens MUST use deterministic fixtures and remain read-only.
(Previously: the reskin requirement did not constrain audit-mode data or mutations.)

#### Scenario: Profiles list renders in v2 style
- GIVEN the user opens `/profiles`
- WHEN the page loads
- THEN the page uses the v2 border, radius, and shadow contract
- AND the current profile data remains accessible

#### Scenario: Audit mode blocks profile mutations
- GIVEN visual audit mode is on
- WHEN the user creates or edits a profile
- THEN the mutation is denied
- AND the fixture-backed list remains unchanged

### Requirement: Create Profile modal matches the PDF contract

The system MUST render a Create Profile modal with a single `Profile name` field, inline `Name is required.` validation, and `CANCEL` plus `SAVE PROFILE` buttons.

#### Scenario: Empty name is rejected inline
- GIVEN the modal is open
- WHEN the user submits with an empty name
- THEN the inline error `Name is required.` appears in magenta

#### Scenario: Modal actions match the reference
- GIVEN the modal is open
- WHEN the user views the footer actions
- THEN `CANCEL` and `SAVE PROFILE` are shown
