# Delta for notification-panel

## ADDED Requirements

### Requirement: Notification panel is a floating anchored popover, not a full-height drawer

The v2 reference (PDF screen 9) shows a compact floating panel anchored to the bell icon in the header, overlaid on top of the active screen without covering it, sized to its content rather than stretching to the viewport height.

The system MUST change `NotificationPanel` from a full-height drawer to a content-sized popover anchored below/near the bell icon (top-right of the header), consistent with the v2 reference.

#### Scenario: Panel opens as a floating popover, not a drawer
- GIVEN the user clicks the bell icon in the header
- WHEN the notification panel opens
- THEN it renders as a compact panel anchored to the bell icon
- AND it does NOT stretch to the full viewport height
- AND it does NOT render a full-screen dark backdrop behind the rest of the UI
- AND the active screen behind it remains visible and legible

#### Scenario: Panel overlays without navigating
- GIVEN the user is on any route
- WHEN the notification panel opens
- THEN the current route does not change
- AND closing the panel (Escape, outside click, or close button) returns focus to the bell trigger

### Requirement: Notification panel uses the v2 double-bar style

The system MUST reskin `NotificationPanel` and `NotificationItem` to the `// NOTIFICATIONS` double-bar style, matching the section-label pattern already used elsewhere (e.g. `// WORKSPACE EVENTS`).

#### Scenario: Header label matches the double-bar pattern
- GIVEN the notification panel is open
- WHEN its header renders
- THEN it displays `// NOTIFICATIONS` in the mono uppercase double-bar style
- AND existing unread/read/dismiss/focus-trap/Escape-to-close behavior still works
- AND the visible styling matches the v2 reference

### Requirement: Notification items keep compact brutalist styling

The system MUST render notification items with the v2 border, radius, and typography contract.

#### Scenario: Notification item is visually aligned
- GIVEN a notification item is shown
- WHEN it renders
- THEN it uses mono uppercase presentation where applicable
- AND it does not fall back to rounded shadcn defaults
