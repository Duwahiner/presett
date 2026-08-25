# Delta for design-tokens

## ADDED Requirements

### Requirement: V2 token contract

The system MUST expose the v2 CSS token set with dark and light values exactly matching `docs/design-system-v2.md`.

#### Scenario: Dark and light tokens are available
- GIVEN the app renders in dark or light mode
- WHEN components consume `--background`, `--foreground`, `--card`, `--primary`, `--accent`, and `--border`
- THEN dark mode uses `#000000`, `#ffffff`, `#0a0a0a`, `#e72286`, `#73ec8b`, `#ffffff`
- AND light mode uses `#f4f4f4`, `#000000`, `#ffffff`, `#e72286`, `#73ec8b`, `#000000`

#### Scenario: Radius and shadows follow v2
- GIVEN the token layer is loaded
- WHEN rounded and shadow utilities are applied
- THEN `--radius` is `0rem`
- AND shadows use a hard offset style with no blur

### Requirement: Typography role split

The system MUST use `--font-mono-jb` for navigation, badges, and technical data, and `--font-inter` for long-form text.

#### Scenario: Navigation and badges are monospaced
- GIVEN the sidebar and status badges render
- WHEN text is displayed in those surfaces
- THEN it uses the mono font contract and uppercase styling

#### Scenario: Body text remains readable
- GIVEN long-form content renders
- WHEN body text is displayed
- THEN it uses the Inter contract
- AND it does not inherit the mono styling by default
