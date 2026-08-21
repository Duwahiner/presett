# Delta for dashboard-page

## ADDED Requirements

### Requirement: Dashboard uses v2 control-room layout

The system MUST reskin the dashboard page to the v2 layout and visual tokens without changing the route.

#### Scenario: Dashboard renders in the v2 shell
- GIVEN the user opens `/`
- WHEN the page loads
- THEN the dashboard uses the v2 tokens, borders, and hard-shadow treatment
- AND it keeps the existing route

### Requirement: Gentle-AI version uses the real probe

The system MUST show the Gentle-AI version from `probeGentleAiVersion`.

#### Scenario: Gentle-AI version is visible
- GIVEN the probe returns a version string
- WHEN the dashboard renders
- THEN the Gentle-AI version card shows that real value

### Requirement: Unprobed agent versions are omitted

The system MUST NOT invent version values for OpenCode, Claude Code, or Codex.

#### Scenario: Installed status replaces version numbers
- GIVEN OpenCode, Claude Code, or Codex are detected as installed or configured
- WHEN the dashboard renders
- THEN the UI shows status only
- AND no fake version number is displayed
