# Delta for delete-backup-modal

## ADDED Requirements

### Requirement: Delete backup modal matches the normalized dialog contract

The system MUST render the delete-backup confirmation modal with the v2 dialog surface and control treatment while preserving its approval workflow.

#### Scenario: Delete confirmation remains intact
- GIVEN the delete modal opens
- WHEN the title, body, and actions render
- THEN deletion still requires confirmation
- AND the dialog uses the square hard-border visual contract
