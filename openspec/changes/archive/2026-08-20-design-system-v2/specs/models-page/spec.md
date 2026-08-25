# Delta for models-page

## ADDED Requirements

### Requirement: Models page adopts the v2 reskin

The system MUST restyle the Models page with the v2 tokens, borders, shadows, and mono navigation treatment.

#### Scenario: Model routing page keeps behavior
- GIVEN the user opens `/models`
- WHEN the page loads
- THEN the page uses the v2 visual system
- AND model-assignment behavior remains available

### Requirement: Existing routing interactions remain intact

The system MUST preserve the current model selection and assignment workflows.

#### Scenario: Assignment flow still works
- GIVEN the user changes a model assignment
- WHEN the change is submitted
- THEN the existing workflow still updates the assignment
- AND the reskin does not change the functional outcome
