# Delta for layout-shell

## ADDED Requirements

### Requirement: Fixed brutalist shell dimensions

The system MUST render the primary shell with a 72px header and a 260px sidebar.

#### Scenario: Shell dimensions match v2
- GIVEN the app shell is visible
- WHEN the layout renders
- THEN the header height is 72px
- AND the sidebar width is 260px

### Requirement: Workspace chrome matches the v2 reference

The system MUST render the `PRESETT` wordmark in uppercase monospaced text and a square workspace avatar.

#### Scenario: Brand chrome is present
- GIVEN the sidebar renders
- WHEN the top branding area appears
- THEN the wordmark is `PRESETT`
- AND the workspace avatar has no radius

### Requirement: Sidebar groups stay fixed

The system MUST keep the current navigation structure as `[ Menu ]` and `[ Workspace ]` without adding new links.

#### Scenario: Existing links only
- GIVEN the sidebar is visible
- WHEN the nav items render
- THEN `[ Menu ]` contains Dashboard, Models, SDD Profiles, Backups
- AND `[ Workspace ]` contains Settings only
