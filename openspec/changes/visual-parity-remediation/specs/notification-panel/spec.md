# Delta for notification-panel

## ADDED Requirements

### Requirement: Notification panel uses the v2 panel grammar

The system MUST align the notification panel, items, and dismiss control to the reference hierarchy and label style without changing open, close, or dismiss behavior.

#### Scenario: Notifications remain functional
- GIVEN the panel opens from the bell trigger
- WHEN items render
- THEN the panel keeps its current interactions
- AND its surface, labels, and controls follow the v2 contract
