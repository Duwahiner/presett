# visual-audit-mode Specification

## Purpose

Provide an opt-in, environment-variable-only visual audit mode for screenshot comparison without changing normal product behavior.

## Requirements

### Requirement: Env-gated audit mode

The system MUST enable visual audit mode only when `PRESETT_VISUAL_AUDIT=1` is present.

#### Scenario: No env gate means normal mode
- GIVEN `PRESETT_VISUAL_AUDIT` is unset or not `1`
- WHEN the app starts
- THEN visual audit mode is off
- AND normal product behavior remains unchanged

#### Scenario: Env gate enables audit mode
- GIVEN `PRESETT_VISUAL_AUDIT=1`
- WHEN the app starts
- THEN visual audit mode is on
- AND only the in-scope audit surfaces are available

### Requirement: Audit mode is read-only and dark

The system MUST force dark visual output in audit mode and MUST NOT allow mutations.

#### Scenario: Mutation is denied
- GIVEN visual audit mode is on
- WHEN a create, update, delete, or submit action is attempted
- THEN the action is blocked
- AND no application state changes

#### Scenario: Dark theme is forced
- GIVEN visual audit mode is on
- WHEN any audited screen renders
- THEN it uses the dark token set
- AND it does not switch to light mode

### Requirement: Audit captures are deterministic

The system MUST render audit surfaces from fixed fixtures and a fixed clock.

#### Scenario: Fixtures and time are stable
- GIVEN visual audit mode is on
- WHEN the same screen renders twice
- THEN the data fixtures are identical
- AND the timestamp-dependent output is identical

### Requirement: Screenshot workflow is valid

The system MUST support a repeatable screenshot flow for audited routes.

#### Scenario: Valid screenshot workflow runs
- GIVEN visual audit mode is on
- WHEN an audited route loads for capture
- THEN the screen settles without live mutation noise
- AND the capture target is stable for comparison
- AND the workflow completes without changing product data
