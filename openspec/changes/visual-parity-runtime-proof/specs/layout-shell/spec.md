# Delta for layout-shell

## ADDED Requirements

### Requirement: Audit mode shell stays visually identical

The system MUST keep the existing shell structure in visual audit mode while forcing dark presentation and hiding mutation entry points.

#### Scenario: Shell renders the same structure
- GIVEN visual audit mode is on
- WHEN the shell renders
- THEN the header, sidebar, and content regions remain present
- AND the shell stays in dark mode

#### Scenario: No mutation controls are exposed
- GIVEN visual audit mode is on
- WHEN shell chrome renders
- THEN controls that would create or change data are hidden or disabled
