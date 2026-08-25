# Delta for badge-primitive

## MODIFIED Requirements

### Requirement: Unified status badge contract

The system MUST preserve pill badges where canonical behavior requires them, while ensuring any badge used in the scoped parity surfaces follows the v2 mono label, compact sizing, and opacity contract.
(Previously: the badge contract applied broadly without the scoped visual hierarchy constraints.)

#### Scenario: Scoped badges match the reference
- GIVEN a badge appears in the scoped surfaces
- WHEN it renders
- THEN it remains semantically unchanged
- AND its label and treatment match the v2 visual system
