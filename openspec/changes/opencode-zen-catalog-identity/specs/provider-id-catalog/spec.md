# Especificación de provider-id-catalog

## Requirements

### Requirement: Canonical provider identity and display names

The system MUST canonicalize provider identity values so UI, auth, and catalog flows use `opencode-zen` as the canonical ID for OpenCode Zen. The system MUST also expose a stable display label map for user-facing rendering.

#### Scenario: Raw OpenCode identifier resolves to the canonical ID
- GIVEN the system receives `opencode` from model catalog or cache data
- WHEN it canonicalizes the provider ID
- THEN the result is `opencode-zen`
- AND internal matching uses the canonical value

#### Scenario: Display rendering uses the product label
- GIVEN the UI renders a provider with canonical ID `opencode-zen`
- WHEN it looks up the display label
- THEN the visible label is `OpenCode Zen`
- AND the canonical ID remains unchanged internally

### Requirement: Cache data migrates on read without destructive writes

The system MUST migrate legacy cache keys from `opencode` to `opencode-zen` in memory when reading model-variant cache data. The system MUST NOT rewrite the cache file during this read path.

#### Scenario: Legacy cache key is upgraded in memory
- GIVEN cache data contains `opencode`
- AND cache data does not contain `opencode-zen`
- WHEN the cache is loaded
- THEN the in-memory result exposes `opencode-zen`
- AND the legacy key is not required by consumers

#### Scenario: Existing canonical cache data is preserved
- GIVEN cache data already contains `opencode-zen`
- WHEN the cache is loaded
- THEN the canonical key remains `opencode-zen`
- AND no duplicate provider entry is introduced

### Requirement: Write-back reverses the canonical ID for CLI compatibility

The system MUST reverse-map `opencode-zen` to `opencode` before persisting provider references back to the OpenCode CLI configuration. The system MUST preserve other provider IDs unchanged.

#### Scenario: Canonical provider writes back as the CLI identifier
- GIVEN the internal provider ID is `opencode-zen`
- WHEN the system writes a model reference to CLI config
- THEN the persisted provider reference is `opencode`
- AND the OpenCode CLI can read it

#### Scenario: Non-OpenCode providers are not rewritten
- GIVEN the internal provider ID is `openai`
- WHEN the system writes the reference back
- THEN the persisted provider reference remains `openai`
