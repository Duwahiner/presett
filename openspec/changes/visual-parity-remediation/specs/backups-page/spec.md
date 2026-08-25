# Delta for backups-page

## ADDED Requirements

### Requirement: Backups page and restore feedback match v2

The system MUST restyle the backups page, restore toast, and delete flow surfaces to the v2 hierarchy while preserving immediate restore and delete confirmation behavior.

#### Scenario: Restore remains immediate
- GIVEN a backup is available
- WHEN the user restores it
- THEN the restore still runs immediately
- AND the success feedback uses the v2 visual contract
