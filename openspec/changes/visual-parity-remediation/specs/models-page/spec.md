# Delta for models-page

## ADDED Requirements

### Requirement: Models hierarchy and selector styling match v2

The system MUST align the models page selector, popover, and empty-state surfaces to the v2 reference while preserving model assignment behavior.

#### Scenario: Model selection still works
- GIVEN the models page loads
- WHEN the user opens or changes a model selection
- THEN the existing assignment flow still completes
- AND the selection UI uses the v2 square contract
