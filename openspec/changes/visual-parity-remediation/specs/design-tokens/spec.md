# Delta for design-tokens

## MODIFIED Requirements

### Requirement: V2 token contract

The system MUST preserve the canonical token values and zero-radius contract while ensuring shared primitives consume the v2 hard-border and hard-shadow defaults from `docs/design-system-v2.md`.
(Previously: tokens were defined, but primitive defaults could still emit softer radii/shadows.)

#### Scenario: Shared primitives follow the token contract
- GIVEN a button, card, or confirm dialog renders
- WHEN it consumes the design tokens
- THEN it uses square corners, hard borders, and hard shadows
- AND it does not reintroduce rounded defaults
