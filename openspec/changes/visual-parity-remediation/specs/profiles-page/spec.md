# Delta for profiles-page

## ADDED Requirements

### Requirement: Profiles hierarchy and create modal match v2

The system MUST keep profile management behavior intact while aligning list hierarchy, mono labels, and Create Profile modal controls to the reference hierarchy/labels/controls.

#### Scenario: Profile creation behavior is preserved
- GIVEN the profiles page or create modal is open
- WHEN the user creates or edits a profile
- THEN the existing workflow still completes
- AND the visible controls follow the v2 square contract
