# Delta for dashboard-page

## MODIFIED Requirements

### Requirement: Dashboard uses v2 control-room layout

The system MUST reskin the dashboard page to the v2 layout and visual tokens without changing the route.
In visual audit mode, the dashboard MUST render with deterministic fixture data and fixed timestamps.
(Previously: the reskin requirement did not constrain audit-mode determinism.)

#### Scenario: Dashboard renders in the v2 shell
- GIVEN the user opens `/`
- WHEN the page loads
- THEN the dashboard uses the v2 tokens, borders, and hard-shadow treatment
- AND it keeps the existing route

#### Scenario: Dashboard output is deterministic in audit mode
- GIVEN visual audit mode is on
- WHEN the dashboard renders twice
- THEN the visible data is stable between renders
- AND time-based values do not drift
