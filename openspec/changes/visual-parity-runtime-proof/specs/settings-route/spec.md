# Delta for settings-route

## MODIFIED Requirements

### Requirement: Route rename to settings

The system MUST expose the configuration screen at `/settings` instead of `/config`.
In visual audit mode, the settings screen MUST remain read-only and deterministic.
(Previously: the route rename requirement did not constrain audit-mode behavior.)

#### Scenario: Settings route is reachable
- GIVEN the user opens the configuration surface
- WHEN the route resolves
- THEN `/settings` loads the existing form

#### Scenario: Old route is no longer primary
- GIVEN a user follows workspace navigation
- WHEN the settings entry is clicked
- THEN the destination is `/settings`

#### Scenario: Audit mode blocks setting changes
- GIVEN visual audit mode is on
- WHEN the user edits or saves settings
- THEN the mutation is denied
- AND the form remains unchanged

### Requirement: Settings form scope stays unchanged

The system MUST keep the current settings form functionality unchanged.

#### Scenario: Existing controls remain available
- GIVEN the settings page is open
- WHEN the form renders
- THEN the current fields and save behavior remain the same
