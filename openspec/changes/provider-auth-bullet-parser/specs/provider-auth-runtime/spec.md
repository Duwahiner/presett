# Delta for provider-auth-runtime

## ADDED Requirements

### Requirement: Accept dual bullet markers in provider parsing

The system MUST treat both U+2022 (`•`) and U+25CF (`●`) as valid provider bullets when extracting connected providers from ANSI CLI output.

#### Scenario: Parse ANSI output with U+2022 bullets

- GIVEN ANSI output containing provider entries marked with `•`
- WHEN the parser extracts connected providers
- THEN it returns each provider ID in normalized form

#### Scenario: Parse ANSI output with U+25CF bullets

- GIVEN ANSI output containing provider entries marked with `●`
- WHEN the parser extracts connected providers
- THEN it returns the same normalized provider IDs

### Requirement: Exclude non-provider lines from results

The system MUST ignore lines that are not provider entries, even when they appear in the same ANSI output block.

#### Scenario: Skip header and unrelated lines

- GIVEN ANSI output with headers, labels, or other non-provider lines
- WHEN the parser processes the output
- THEN only provider entries are included in the result

### Requirement: Verify against real ANSI CLI output

The system MUST be covered by a test that uses real ANSI-formatted CLI output rather than plain-text mocks.

#### Scenario: Preserve five normalized providers

- GIVEN captured ANSI output containing five known credentials
- WHEN the parser runs in the test
- THEN it returns the five expected normalized IDs
- AND it does not return an empty provider list
