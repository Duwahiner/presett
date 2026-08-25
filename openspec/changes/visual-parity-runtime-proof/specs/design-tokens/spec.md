# Delta for design-tokens

## MODIFIED Requirements

### Requirement: V2 token contract

The system MUST expose the v2 CSS token set with dark and light values exactly matching `docs/design-system-v2.md`.
In visual audit mode, the system MUST force the dark token set regardless of normal theme preference.
(Previously: token exposure was not tied to an env-gated audit mode.)

#### Scenario: Dark and light tokens are available
- GIVEN the app renders in dark or light mode
- WHEN components consume `--background`, `--foreground`, `--card`, `--primary`, `--accent`, and `--border`
- THEN dark mode uses `#000000`, `#ffffff`, `#0a0a0a`, `#e72286`, `#73ec8b`, `#ffffff`
- AND light mode uses `#f4f4f4`, `#000000`, `#ffffff`, `#e72286`, `#73ec8b`, `#000000`

#### Scenario: Audit mode forces dark tokens
- GIVEN visual audit mode is on
- WHEN audited surfaces render
- THEN the dark token set is used
- AND light-mode overrides are ignored
