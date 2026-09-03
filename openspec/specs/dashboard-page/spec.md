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

### Requirement: Last synchronization is independent of the last backup
The system MUST show `Last sync` in a separate card from `Last backup` and MUST NOT derive it from `BackupInfo.timestamp`.

#### Scenario: Two semantically distinct dates are shown
- GIVEN the dashboard receives a sync timestamp and backups with their own dates
- WHEN the page renders
- THEN `Last backup` and `Last sync` are shown as independent values

#### Scenario: Backup does not replace synchronization
- GIVEN a recent backup exists but not a sync timestamp
- WHEN the dashboard renders
- THEN the sync card does not reuse the backup date

### Requirement: Visible fallback for "Never" state
The system MUST show `Never` when a persisted timestamp does not exist or is invalid.

#### Scenario: No prior synchronization
- GIVEN `sync-state.json` does not exist
- WHEN the dashboard renders
- THEN the sync card shows `Never`

#### Scenario: File is invalid
- GIVEN the sync record is invalid JSON or contains an invalid date
- WHEN the dashboard renders
- THEN the sync card shows `Never`

### Requirement: Refresh after successful sync
The system MUST revalidate the dashboard after a successful sync to show the new date without manual navigation.

#### Scenario: New date appears after sync
- GIVEN the user executes a successful sync
- WHEN the operation finishes
- THEN the dashboard reflects the new timestamp in the next view
