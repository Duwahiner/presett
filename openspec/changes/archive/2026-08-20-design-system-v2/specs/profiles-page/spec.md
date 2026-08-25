# Delta for profiles-page

## ADDED Requirements

### Requirement: Profiles page adopts the v2 reskin

The system MUST restyle `/profiles` with the v2 tokens and brutalist layout while preserving existing profile management behavior.

#### Scenario: Profiles list renders in v2 style
- GIVEN the user opens `/profiles`
- WHEN the page loads
- THEN the page uses the v2 border, radius, and shadow contract
- AND the current profile data remains accessible

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
