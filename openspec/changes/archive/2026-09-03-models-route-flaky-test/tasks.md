# Tasks: models-route-flaky-test

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 50-100 |
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
| 1 | Mocking y Aislamiento de Ruta | PR 1 | `npx vitest run src/app/api/models` | N/A | `git checkout HEAD -- src/app/api/models/__tests__/route.test.ts` |
| 2 | Validación de Estabilidad Paralela | PR 1 | `for i in {1..5}; do npx vitest run --reporter=verbose & done; wait` | N/A | N/A |

## Phase 1: Foundation / Infrastructure (Mocking)

- [x] 1.1 Modificar `src/app/api/models/__tests__/route.test.ts` para implementar `vi.mock` hoisted del módulo `providerAuthService`.
- [x] 1.2 Implementar el contrato `ConnectedProvider[]` y casos de éxito/fallo en el mock.
- [x] 1.3 Configurar `vi.stubEnv` en `beforeEach` para asegurar aislamiento de variables de entorno por prueba.
- [x] 1.4 Configurar `vi.resetAllMocks()` y `vi.unstubAllEnvs()` en `afterEach` para limpieza de estado entre casos.

## Phase 2: Testing / Verification

- [x] 2.1 Verificar que `GET /api/models` devuelve el catálogo correcto usando fixtures controlados con el mock.
- [x] 2.2 Verificar el caso de fallo: `getConnectedProvidersSafe` rechaza, pero catálogo se devuelve correctamente.
- [x] 2.3 Ejecutar script de validación de paralelismo: 5 corridas simultáneas de `vitest` para asegurar estabilidad y ausencia de colisiones de `process.env`.
- [x] 2.4 Confirmar que la cobertura de `providerAuthService.test.ts` se mantiene intacta.
