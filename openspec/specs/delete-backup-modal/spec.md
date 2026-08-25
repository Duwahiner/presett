# Delta for delete-backup-modal

## ADDED Requirements

### Requirement: Delete backup confirmation modal

The system MUST show a confirmation modal before permanently deleting a backup.

#### Scenario: Modal text matches the approved contract
- GIVEN the user requests deletion of a backup named `{name}`
- WHEN the modal opens
- THEN the title is `DELETE BACKUP?`
- AND the body is `This action permanently removes {name}.`

#### Scenario: Modal actions match the approved contract
- GIVEN the delete modal is open
- WHEN the footer renders
- THEN `CANCEL` is an outline button
- AND `DELETE` is a magenta solid button
- AND a `✕` close control is available
