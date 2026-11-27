# Delta for profile-detail-endpoint

## ADDED Requirements

### Requirement: Detalle de perfil reconoce Base como identidad explícita

The system MUST resolve Base as the canonical empty-name profile while preserving the existing named-profile detail contract.

#### Scenario: Base detail resolves through the reserved identity
- GIVEN the client requests the Base profile detail
- WHEN the reserved Base identity is used
- THEN the system returns the full Base detail
- AND the profile identity remains `name: ""`

#### Scenario: Detail absent still fails
- GIVEN no profile exists for the requested identity
- WHEN detail is requested
- THEN the system returns a not-found error
