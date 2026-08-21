# Delta for layout-shell

## ADDED Requirements

### Requirement: Shell chrome matches the v2 reference hierarchy

The system MUST keep the existing shell, routes, and navigation while aligning header, sidebar, and notification trigger visuals to the v2 references.

#### Scenario: Shell visuals are normalized
- GIVEN the app shell renders
- WHEN the header and sidebar appear
- THEN dimensions remain unchanged
- AND chrome uses square, mono, hard-border styling
