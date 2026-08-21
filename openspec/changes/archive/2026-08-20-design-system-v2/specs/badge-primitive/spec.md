# Delta for badge-primitive

## ADDED Requirements

### Requirement: Unified status badge contract

The system MUST render status badges with `h-7`, `rounded-full`, `font-mono`, `text-[11px]`, `font-bold`, `leading-4`, and uppercase text.

#### Scenario: Badge visual contract is consistent
- GIVEN a status badge is rendered anywhere in the app
- WHEN the badge appears
- THEN it uses the unified v2 size and typography contract
- AND it remains pill-shaped

### Requirement: Semantic badge styling uses opacity

The system MUST render badge backgrounds at 15% semantic opacity and borders at 50% semantic opacity.

#### Scenario: Configured badge uses semantic opacity
- GIVEN a badge represents an active or configured state
- WHEN it renders
- THEN the background uses the semantic color at 15%
- AND the border uses the semantic color at 50%

### Requirement: Badges include a contextual icon

The system MUST include one contextual icon inside each visible status badge.

#### Scenario: Badge contains icon and label
- GIVEN a badge is visible
- WHEN the badge renders
- THEN it shows one icon and one uppercase label
