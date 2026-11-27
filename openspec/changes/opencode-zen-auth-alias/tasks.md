# Tasks: OpenCode Zen Auth Alias

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~150 lines |
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
| 1 | Logic cleanup & Provider mapping | PR 1 | `vitest src/lib/providerIdentity.test.ts` | `opencode providers list` | Revert `src/lib` changes |
| 2 | Service & Adapter revert | PR 1 | `vitest src/services/modelCatalogService.test.ts` | `opencode models --verbose` | Revert `src/services/modelCatalogService.ts` |
| 3 | UI Integration & Testing | PR 1 | `vitest src/components/molecules/ModelPicker` | `ModelPicker` UI preview | Revert UI/test changes |

## Phase 1: Infrastructure Cleanup & Mapping

- [x] 1.1 `src/lib/providerIdentity.ts`: Remove `CATALOG_ID_MAP`, `REVERSE_MAP`, `canonicalProviderId`, `catalogIdToCliRef`.
- [x] 1.2 `src/lib/providerIdentity.ts`: Add `resolveProviderLabel(id, isConnected)`.
- [x] 1.3 `src/services/providerAuthService.ts`: Update `normalizeProviderName` to map `"opencode zen"` → `"opencode"`.

## Phase 2: Core Implementation

- [x] 2.1 `src/services/modelCatalogService.ts`: Remove `canonicalProviderId` usage in `parseVerboseOpencodeModelsOutput`; ingest `providerID` directly.
- [x] 2.2 `src/services/modelCatalogService.ts`: Remove migration logic in `loadMergedModelCatalogSafe`.
- [x] 2.3 `src/adapters/opencode.ts`: Remove normalization logic in `listModelAssignments`.

## Phase 3: UI Integration

- [x] 3.1 `src/components/molecules/ModelPicker/modelPicker.tsx`: Use `resolveProviderLabel` for provider names.
- [x] 3.2 `src/components/molecules/ModelPicker/modelPicker.tsx`: Update marker logic to `connectedProviders.has("opencode-zen") && provider.id === "opencode"`.

## Phase 4: Testing & Verification

- [x] 4.1 `src/lib/__tests__/providerIdentity.test.ts`: Replace old identity tests with `resolveProviderLabel` tests.
- [x] 4.2 `src/services/__tests__/modelCatalogService.test.ts`: Revert fixtures to `"opencode"`.
- [x] 4.3 Verify `ModelPicker` scenarios: "OpenCode Zen con suscripción" (marker visible) and "OpenCode sin suscripción" (marker hidden).
