# Delta for models-page

## MODIFIED Requirements

### Requirement: Models page adopts the v2 reskin

The system MUST restyle the Models page with the v2 tokens, borders, shadows, and mono navigation treatment.
In visual audit mode, the page MUST be read-only and deterministic.
(Previously: the reskin requirement did not constrain audit-mode behavior.)

#### Scenario: Model routing page keeps behavior
- GIVEN the user opens `/models`
- WHEN the page loads
- THEN the page uses the v2 visual system
- AND model-assignment behavior remains available

#### Scenario: Audit mode blocks edits
- GIVEN visual audit mode is on
- WHEN the user attempts to change a model assignment
- THEN the change is denied
- AND the current model state remains unchanged
