# Delta for backups-page

## ADDED Requirements

### Requirement: Backups page adopts the v2 reskin

The system MUST restyle `/backups` with the v2 control-room visual system.

#### Scenario: Backups page loads in v2 style
- GIVEN the user opens `/backups`
- WHEN the page renders
- THEN it uses the v2 tokens, hard borders, and hard shadows

### Requirement: Restore executes immediately

The system MUST restore a backup immediately without a confirmation step and MUST show `✓ Restored {name}` on success.

#### Scenario: Restore does not ask for confirmation
- GIVEN a backup is available to restore
- WHEN the user selects restore
- THEN the restore action runs immediately
- AND the success toast reads `✓ Restored {name}`

### Requirement: Delete confirmation remains separate from restore

The system MUST NOT reuse restore confirmation for delete behavior.

#### Scenario: Delete is not restored by mistake
- GIVEN the user is on the backups page
- WHEN a delete action is requested
- THEN delete follows its own confirmation flow or modal
- AND restore behavior remains immediate
