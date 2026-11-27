# Tasks: Rename Base Profile Label

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | < 20 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Renombrar literal y actualizar tests | PR 1 | `npm test src/adapters/__tests__/profiles.test.ts src/components/organisms/ProfilesClient/__tests__/profilesClientView.test.tsx` | `npm test` | Reversión de los 3 archivos modificados |

## Phase 1: Core Implementation

- [x] 1.1 Modificar `src/adapters/opencode.ts` (Línea 282: `"Base"` → `"Gentle-Orchestrator"`)

## Phase 2: Testing

- [x] 2.1 Añadir aserción `expect(base?.displayName).toBe("Gentle-Orchestrator")` en `src/adapters/__tests__/profiles.test.ts`
- [x] 2.2 Actualizar fixture `displayName: "Gentle-Orchestrator"` en `src/components/organisms/ProfilesClient/__tests__/profilesClientView.test.tsx` (Línea 382)
- [x] 2.3 Ejecutar tests: `npm test` para asegurar que el cambio de label no afecta contratos de vista

## Phase 3: Verification

- [x] 3.1 Verificación visual rápida (si posible mediante componente storybook o mock view) de que el perfil base ahora muestra "Gentle-Orchestrator"
