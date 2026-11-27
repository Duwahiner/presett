# Tasks: provider-auth-runtime-reliability

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 150-250 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | exception-ok |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Full implementation | PR 1 | `npm test -- providerAuthService.test.ts` | Unit tests with mocks | Logic in `provider-auth-runtime` |

## Phase 1: Infrastructure / Types

- [x] 1.1 Define `ProviderAuthError` type in `src/lib/types.ts` (design path: `src/lib/types.ts`, no `src/errors.ts` exists)
- [x] 1.2 Define `ProviderAuthStatus` (additive) in `src/lib/types.ts`; thread it through the `/api/models` response and the frontend `CatalogResponse` type

## Phase 2: Core Implementation

- [x] 2.1 Implement `getConnectedProvidersSafe` in `src/services/providerAuthService.ts` using `exec` with explicit whitelisted env (`HOME`/`USERPROFILE`/`PATH`), constant command and timeout
- [x] 2.2 Add error classification (`classifyProviderAuthError`) to differentiate `ENOENT`/exit 127 (`CLI_NOT_FOUND`), timeout kill (`CLI_TIMEOUT`), parse failure (`PARSE_ERROR`) and generic CLI failure (`CLI_ERROR`)

## Phase 3: Integration

- [x] 3.1 Integrate `providerAuthStatus` into `src/app/api/models/route.ts` response (additive, never blocks the catalog)
- [x] 3.2 Update models page UI to consume `providerAuthStatus` (warning banner on `ok:false`, catalog still rendered)

## Phase 4: Testing (Threat Matrix)

- [x] 4.1 Test Injection: verify the constant command is passed without interpolation (Mocked)
- [x] 4.2 Test Env Leakage: verify only whitelisted env keys are passed (Mocked)
- [x] 4.3 Test Credential Path Leakage: verify `message` is sanitized, no absolute paths/tokens (Mocked)
- [x] 4.4 Test Timeout DoS: verify timeout config + `CLI_TIMEOUT` mapping (Mocked)
- [x] 4.5 Test ENOENT (Windows): verify graceful `CLI_NOT_FOUND` when the CLI is missing (Mocked)

## Phase 5: Cleanup

- [x] 5.1 Update JSDoc and API documentation for `providerAuthStatus` (types, route, service, frontend prop)
