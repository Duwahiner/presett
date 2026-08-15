# Tasks: global-gentle-ai-opencode-config

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 250-300 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Global config surface | PR 1 | `npm run test:unit:config` | `npm run dev` | Revert API + Client organism |

## Phase 1: Infrastructure & Types

- [x] 1.1 Define `Locale` type and extend `StateJson` with `language` field.
- [x] 1.2 Create `src/adapters/gentle-ai.ts` with `readGentleAiConfigSafe` and `writeGentleAiConfig`.
- [x] 1.3 Add `globalConfigApiService` to interact with `/api/config`.
- [x] 1.4 Update `openCodeGlobalPatchSchema` to use allowlist instead of `.passthrough()`.

## Phase 2: Core Implementation (API & Routes)

- [x] 2.1 Extend `/api/config` GET/PATCH to handle Gentle-AI config domain.
- [x] 2.2 Implement atomic backup/rename logic in `gentle-ai.ts` write operation.

## Phase 3: Integration (UI Organism)

- [x] 3.1 Create `GlobalConfigClient` client organism.
- [x] 3.2 Ensure `/config` entry is added to primary navigation.
- [x] 3.3 Connect `GlobalConfigClient` to `globalConfigApiService`.

## Phase 4: Testing & Verification

- [x] 4.1 Write unit tests for `resolveDisplayLocale` (cover undefined, es-AR, fr-FR, explicit).
- [x] 4.2 Add focused API contract coverage through schema and adapter tests.
- [x] 4.3 Verify `StateJson` handles missing `language` field without crashing/writing prematurely.
- [x] 4.4 Perform route/UI smoke validation via TypeScript compilation and focused tests.

## Phase 5: Cleanup & Documentation

- [x] 5.1 No temporary mock/test fixtures added.
- [x] 5.2 Documented schema constraints in implementation contracts and task evidence.

## Focused Remediation: Verify report revision 0afb0c4e

- [x] R1 Return sanitized field-level errors for invalid PATCH bodies without mutation.
- [x] R2 Add runtime/integration coverage for GET defaults, both PATCH domains, no-file creation, no-mutation, safe failures, and active model persistence.
- [x] R3 Add component runtime coverage for both sections, defaults, active model display, and independent saves.
- [x] R4 Record Strict TDD RED/GREEN/REFACTOR and remediation Work Unit Evidence.
- [x] R5 Add runtime coverage for a real OpenCode write-path failure and sanitize the HTTP response.

### Remediation Work Unit Evidence: R5

- Focused test: `npx vitest run src/app/api/config/__tests__/route.test.ts` — 1 file, 11 tests passed, exit 0.
- Runtime harness: Vitest filesystem/request-handler execution forces `opencode.json.presett-tmp` to be a directory; the route returns HTTP 500 with only `Configuration could not be saved`.
- Typecheck: `npx tsc --noEmit` — passed, exit 0.
- Rollback boundary: revert only `src/app/api/config/__tests__/route.test.ts`, `src/app/api/config/route.ts`, and `src/adapters/opencode.ts`.
- TDD: RED (11 tests, 1 failed on leaked `opencode.json` and cleanup exception) → GREEN (11/11 passed) → REFACTOR (generic route error and recursive temporary cleanup).
