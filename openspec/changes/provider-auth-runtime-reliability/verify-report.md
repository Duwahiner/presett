```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:02484a36f581007bdf890b9fc840c3e0e9f2eb5d719c5ae329c5f4595b23cae0
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 4/4
scenarios: 7/7
test_command: npm test
test_exit_code: 0
test_output_hash: sha256:26a05dc0f29e7121fcca449aa10e735bd59c94e9c436f109f6ebd73c57c5aac0
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:c495b35e12c5b919949d4d5176b24605138bbd9702064d1ae54eee886ee7edbe
```

## Verification Report

**Change**: provider-auth-runtime-reliability
**Version**: N/A
**Mode**: Strict TDD

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | 12 |
| Tasks complete | 12 |
| Tasks incomplete | 0 |

### Build & Tests Execution
**Build**: ✅ Passed (`npm run build`, exit 0)
```text
✓ Generating static pages using 15 workers (12/12)
Route (app) — /api/models, /api/profiles, /api/profiles/base, etc. prerenderizadas como dinámicas
```

**Tests**: ✅ 680 passed / 0 failed / 0 skipped (`npm test`, exit 0)
```text
Test Files  83 passed (83)
     Tests  680 passed (680)
```

**Type Checker**: ✅ `npx tsc --noEmit` exit 0 (sin errores)
**Coverage (archivos del cambio)**: ver sección Changed File Coverage

### Spec Compliance Matrix
| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| provider-auth-runtime / Invocación determinista del CLI | Windows resuelve el binario con entorno heredado | `providerAuthService.test.ts > getConnectedProvidersSafe "invokes the exact constant command without interpolation"` + `"passes a whitelisted env"` + `"configures a timeout and does not override the shell"` | ✅ COMPLIANT |
| provider-auth-runtime / Invocación determinista del CLI | La falta de entorno no rompe la detección | `providerAuthService.test.ts > buildSafeEnv "omits variables that are missing or empty"` | ✅ COMPLIANT |
| provider-auth-runtime / Estado explícito para fallo o lista vacía | Lista vacía real | `route.test.ts "exposes providerAuthStatus ok: true for a legitimate empty list"` + `parseConnectedProvidersSafe "returns ok with empty array"` | ✅ COMPLIANT |
| provider-auth-runtime / Estado explícito para fallo o lista vacía | Fallo de CLI | `providerAuthService.test.ts > getConnectedProvidersSafe (CLI_NOT_FOUND / CLI_TIMEOUT / CLI_ERROR)` + `route.test.ts "returns the catalog when the connected providers lookup fails"` | ✅ COMPLIANT |
| provider-auth-runtime / La respuesta no expone secretos | Error sanitizado | `classifyProviderAuthError "sanitizes every mapped message"` + `parseConnectedProvidersSafe "sanitizes the PARSE_ERROR message"` + `buildSafeEnv "never leaks keys matching key, token, secret or password"` | ✅ COMPLIANT |
| models-page / La página distingue fallo y lista vacía | Fallo visible sin perder catálogo | `modelsClientView.test.tsx "renders a warning banner when provider detection fails without hiding the catalog"` | ✅ COMPLIANT |
| models-page / La página distingue fallo y lista vacía | Lista vacía legítima | `modelsClientView.test.tsx "renders no provider-auth warning when detection succeeds"` | ✅ COMPLIANT |

**Compliance summary**: 7/7 scenarios compliant

### Correctness (Static Evidence)
| Requirement | Status | Notes |
|------------|--------|-------|
| Invocación determinista del CLI en Windows | ✅ Implemented | `getConnectedProvidersSafe` usa `exec` con `buildSafeEnv(process.env)` (solo `HOME`/`USERPROFILE`/`PATH`), comando literal constante y `timeout: 10000` |
| Estado explícito para fallo o lista vacía | ✅ Implemented | `ProviderAuthStatus = { ok:true } | { ok:false; code; message }` en `types.ts`, expuesto aditivamente en `route.ts` |
| La respuesta no expone secretos | ✅ Implemented | `classifyProviderAuthError` devuelve mensajes constantes por `code`; `cause` nunca se serializa |
| La página distingue fallo y lista vacía | ✅ Implemented | `ModelsClientView` renderiza `ErrorBanner variant="warning"` en `ok:false` sin ocultar el catálogo; `providerAuthStatus` se propaga en `ModelsClient` |

### Coherence (Design)
| Decision | Followed? | Notes |
|----------|-----------|-------|
| Nuevo `ProviderAuthError` separado de `ConfigError` | ✅ Yes | `ProviderAuthErrorCode` independiente en `types.ts` |
| Invocación subprocess `exec + env + shell: true` en Windows | ⚠️ Partial | No se asigna `shell` explícito; se confía en el shell por defecto de `exec` (cmd.exe en win32). Funcionalmente equivalente, pero desvía de la decisión documentada |
| Campo `providerAuthStatus` aditivo | ✅ Yes | Añadido, no reemplaza `connectedProviders` |
| Sanitización con mensaje constante por `code` | ✅ Yes | `PROVIDER_AUTH_MESSAGES` / `PARSE_ERROR_MESSAGE` |

### TDD Compliance (Strict TDD)
| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ❌ | El artefacto `apply-progress` no existe (no se puede cruzar la tabla RED/GREEN/TRIANGULATE/SAFETY NET) |
| All tasks have tests | ✅ | 12/12 tasks; 3 archivos de test cubren el cambio |
| RED confirmed (tests exist) | ✅ | 38 tests verificados en 3 archivos |
| GREEN confirmed (tests pass) | ✅ | 38/38 pass en ejecución focal; 680/680 en suite completa |
| Triangulation adequate | ✅ | Casos `CLI_NOT_FOUND`/`CLI_TIMEOUT`/`CLI_ERROR`/`PARSE_ERROR` diferenciados con expectativas de valor distintas |
| Safety Net for modified files | ⚠️ | No verificable sin `apply-progress` |

**TDD Compliance**: 4/6 checks passed (2 no verificables por ausencia de `apply-progress`)

### Test Layer Distribution
| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 28 | 1 | vitest (mock `node:child_process`) |
| Integration | 10 | 2 | vitest + @testing-library/react |
| E2E | 0 | 0 | — |
| **Total** | **38** | **3** | |

### Changed File Coverage
| File | Line % | Branch % | Rating |
|------|--------|----------|--------|
| `src/services/providerAuthService.ts` | 100% | 100% | ✅ Excellent |
| `src/app/api/models/route.ts` | 100% | 71.4% | ⚠️ Acceptable (helpers env-dir y rama 503 sin cubrir) |
| `src/components/organisms/ModelsClient/modelsClientView.tsx` | 92.7% | 60% | ⚠️ Acceptable |
| `src/components/organisms/ModelsClient/modelsClient.tsx` | 0% | 100% | ⚠️ Low (orquestación cliente; sin test unitario directo) |

**Nota**: cobertura informativa, no bloqueante.

### Assertion Quality
✅ All assertions verify real behavior. Sin tautologías (`expect(true).toBe(true)`), sin bucles fantasma, sin aserciones solo de tipo. Las suites de negación (sanitización de mensajes, whitelist de env) usan regex significativas.

### Quality Metrics
**Linter**: ➖ No ejecutado en este pass (opcional)
**Type Checker**: ✅ 0 errors (`npx tsc --noEmit`)

### Issues Found
**CRITICAL**: None
**WARNING**:
- Design deviation: `shell: true` en Windows no se asigna explícitamente; se usa el shell por defecto de `exec` (equivalente funcional, mejora la postura de seguridad al no codificar `true`).
- Artefacto `apply-progress` ausente: imposible cruzar la evidencia TDD RED/GREEN contra el reporte de apply en modo Strict TDD.
**SUGGESTION**:
- Añadir test unitario directo de `ModelsClient` (orquestación) para cubrir el threading de `providerAuthStatus` (hoy 0% de cobertura en ese archivo).

### Verdict
**PASS WITH WARNINGS**
Los 4 requisitos y 7 escenarios tienen cobertura de test que pasa en runtime; build y type-check limpios. Dos hallazgos WARNING no bloqueantes (desviación de diseño y ausencia de `apply-progress`).
