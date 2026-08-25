# Delta for backups-page

## MODIFIED Requirements

### Requirement: Backups page adopts the v2 reskin

The system MUST restyle `/backups` with the v2 control-room visual system.
In visual audit mode, backup content MUST be deterministic and read-only.
(Previously: the reskin requirement did not constrain audit-mode behavior.)

#### Scenario: Backups page loads in v2 style
- GIVEN the user opens `/backups`
- WHEN the page renders
- THEN it uses the v2 tokens, hard borders, and hard shadows

#### Scenario: Audit mode blocks backup mutations
- GIVEN visual audit mode is on
- WHEN the user tries to restore or delete a backup
- THEN the mutation is denied
- AND the displayed backup list stays unchanged

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
