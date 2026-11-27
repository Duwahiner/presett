# Base profile detail endpoint Specification

## Purpose

Expose the Base profile as an explicit identity so its full detail can be hydrated like any named profile.

## Requirements

### Requirement: Base detail is addressable by reserved route

The system MUST return the full Base profile detail from `GET /api/profiles/base`.

#### Scenario: Base detail resolves successfully
- GIVEN the Base profile exists with persisted assignments
- WHEN the client requests `GET /api/profiles/base`
- THEN the response includes the Base profile detail
- AND includes its persisted assignments

#### Scenario: Base route is distinct from list
- GIVEN the client requests the Base detail route
- WHEN the request is evaluated
- THEN the system does not return the profiles list

### Requirement: Base detail preserves the empty-name identity

The system MUST treat Base as the canonical empty-name profile when resolving detail.

#### Scenario: Base maps to empty-name identity
- GIVEN the Base profile is stored with `name: ""`
- WHEN detail is requested through the reserved route
- THEN the returned profile identity remains empty-name
- AND no profile name is renamed
