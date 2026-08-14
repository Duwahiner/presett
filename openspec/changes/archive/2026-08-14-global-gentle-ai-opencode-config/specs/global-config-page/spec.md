# Delta for global-config-page

## ADDED Requirements

### Requirement: Unified config surface

The system MUST expose a `/config` page with separate Gentle-AI and OpenCode sections.

#### Scenario: First visit shows both sections
- GIVEN the user opens `/config`
- WHEN the page loads
- THEN both sections are visible with current values or defaults

#### Scenario: Missing config is non-fatal
- GIVEN one or both config sources do not exist
- WHEN the user opens `/config`
- THEN defaults are shown
- AND no file is created

### Requirement: Domain-scoped saves

The system MUST save Gentle-AI and OpenCode changes independently.

#### Scenario: Save Gentle-AI only
- GIVEN both sections have edited values
- WHEN the user saves only Gentle-AI
- THEN only Gentle-AI data is written
- AND OpenCode data remains unchanged

#### Scenario: Save OpenCode only
- GIVEN both sections have edited values
- WHEN the user saves only OpenCode
- THEN only OpenCode data is written
- AND Gentle-AI data remains unchanged

### Requirement: Safe validation and error handling

The system MUST validate editable fields before writing and MUST not mutate files on invalid input.

#### Scenario: Invalid field is rejected
- GIVEN a field value fails validation
- WHEN the user submits the section
- THEN the response includes field-level errors
- AND no file is written

#### Scenario: Error details stay safe
- GIVEN a write or read failure occurs
- WHEN the API responds
- THEN no file paths or secrets are exposed

## MODIFIED Requirements

### Requirement: OpenCode active model exposure

The system MUST expose the active OpenCode model in the config surface and allow it to be updated through the OpenCode section.
(Previously: OpenCode model state was only available through adapter-specific flows, not a unified config surface.)

#### Scenario: Current model is visible
- GIVEN OpenCode config exists
- WHEN the config page loads
- THEN the active model is shown in the OpenCode section

#### Scenario: Model update persists safely
- GIVEN a valid model is selected
- WHEN the user saves the OpenCode section
- THEN the model update is persisted
- AND the existing OpenCode write guarantees still apply
