# Delta for global-config-page

## ADDED Requirements

### Requirement: Config page matches the v2 settings surface

The system MUST restyle the settings/config page to the v2 reference hierarchy and controls while preserving current save and validation behavior.

#### Scenario: Settings actions still work
- GIVEN the config page loads
- WHEN the user edits and saves a section
- THEN the existing validation and persistence remain intact
- AND the surface uses the v2 square control contract
