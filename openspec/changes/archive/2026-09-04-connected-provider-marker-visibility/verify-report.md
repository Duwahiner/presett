```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:64a23758cedad9382962dca84d6edd28a20d06904bf5671a30ffa1bb47cca4d7
verdict: pass
blockers: 0
critical_findings: 0
requirements: 3/3
scenarios: 7/7
test_command: npx vitest run
test_exit_code: 0
test_output_hash: sha256:541b87fbd67e8e72be9cef5f4a7d32d64e44f41a0d8187c9be1f0c9582c1950c
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:64f0036d46551bb01fc5675cc5b8222fbf658167b404b008a10fb38042833a44
```

## Verification Report

**Change**: connected-provider-marker-visibility
**Version**: N/A (delta specs)
**Mode**: Strict TDD (vitest) + Hybrid persistence

### Completeness

| Metric | Value |
|--------|-------|
| Tasks total | 7 |
| Tasks complete | 7 |
| Tasks incomplete | 0 |

### Build & Tests Execution

**Build**: ✅ Passed
```text
npm run build → next build → exit 0
✓ Compiled successfully · Finished TypeScript · 12/12 static pages generated
All routes compiled (/, /models, /profiles, /api/profiles/base, /api/profiles/[name], ...)
```

**Tests**: ✅ 657 passed / ❌ 0 failed / ⚠️ 0 skipped
```text
npx vitest run → exit 0
Test Files  83 passed (83)
     Tests  657 passed (657)
```

**Coverage**: ➖ Not run in this verification (informational only under Strict TDD)

### Spec Compliance Matrix

| Requirement | Scenario | Test | Result |
|-------------|----------|------|--------|
| models-page: marcador de suscripción activa se conserva | Proveedor conectado muestra marcador en trigger cerrado | `modelPicker.test.tsx > shows the connected marker in the trigger while the selector is closed` | ✅ COMPLIANT |
| models-page: marcador de suscripción activa se conserva | Proveedor conectado conserva marcador al abrir selector | `modelPicker.test.tsx > shows the connected marker for a connected provider and hides it otherwise` | ✅ COMPLIANT |
| models-page: OpenCode Zen se normaliza a identificador canónico | El nombre compuesto resuelve el ID correcto | `providerAuthService.test.ts > normalizeProviderName("OpenCode Zen") → "opencode-zen"` | ✅ COMPLIANT |
| models-page: OpenCode Zen se normaliza a identificador canónico | El valor normalizado habilita el marcador | `providerAuthService.test.ts` (normalize) + `modelPicker.test.tsx` (marker connected, id-agnóstico) | ✅ COMPLIANT |
| profiles-page: se conservan asignaciones fuera de catálogo | La asignación fuera de catálogo sigue editable | `profilesClientView.test.tsx > renders an out-of-catalog assignment with a badge and keeps it editable`, `profilesClient.test.tsx > preserves an out-of-catalog assignment in the PUT payload` | ✅ COMPLIANT |
| profiles-page: se conservan asignaciones fuera de catálogo | Proveedor conectado muestra marcador con selector cerrado | `profilesClientView.test.tsx > trigger [title="Connected"] not null (closed)` | ✅ COMPLIANT |
| profiles-page: se conservan asignaciones fuera de catálogo | Proveedor conectado conserva marcador al abrir selector | `profilesClientView.test.tsx > option [title="Connected"] not null (open)` | ✅ COMPLIANT |

**Compliance summary**: 7/7 scenarios compliant

### Correctness (Static Evidence)

| Requirement | Status | Notes |
|------------|--------|-------|
| Marcador `bg-success` en trigger cerrado | ✅ Implemented | `PickerField` (modelPicker.tsx) envuelve `Select.Value` en span + marker condicional `value && connectedSet?.has(value)`; `OrchestratorPicker` (profilesClientView.tsx) ídem con `value.provider && connectedSet.has(value.provider)` |
| Mapeo canónico `opencode-zen` | ✅ Implemented | `providerAuthService.ts` línea 94: `"opencode zen": "opencode-zen"` (era `"opencode"`) |

### Coherence (Design)

| Decision | Followed? | Notes |
|----------|-----------|-------|
| Span hermano tras `Select.Value` (preserva ARIA) | ✅ Yes | Aplicado en ambas superficies; marker con `aria-hidden="true"` y `title="Connected"` |
| Rechazar reemplazo custom de `Select.Value` / overlay absoluto | ✅ Yes | No se tocaron internals de Base UI |
| Fix de mapeo en una sola línea | ✅ Yes | Línea 94 modificada exactamente como el design |
| Testing: unit + 2 integration + regresión (≥3 casos) | ✅ Yes | 1 caso unit, 2 integration (marker cerrado), 2 regresión (no marker) |

### TDD Compliance

| Check | Result | Details |
|-------|--------|---------|
| TDD Evidence reported | ✅ | Tabla "TDD Cycle Evidence" en apply-progress (Engram #1015) |
| All tasks have tests | ✅ | 7/7 filas con archivo de test |
| RED confirmed (tests exist) | ✅ | Test files verificados en disco |
| GREEN confirmed (tests pass) | ✅ | 657/657 pass en ejecución |
| Triangulation adequate | ✅ | Mapeo unit (compuesto + mayúsculas); marker 2 casos positivos + 2 regresión por superficie; el caso literal `opencode-zen` renderizado queda como sugerencia de dato, no de comportamiento |

**TDD Compliance**: 5/5 checks passed

### Test Layer Distribution

| Layer | Tests | Files | Tools |
|-------|-------|-------|-------|
| Unit | 8 | providerAuthService.test.ts | vitest |
| Integration (component) | 58 | modelPicker.test.tsx (10), profilesClientView.test.tsx (48) | vitest + @testing-library/react + user-event |

### Assertion Quality

**Assertion quality**: ✅ All assertions verify real behavior. Los tests de marker usan `querySelector('[title="Connected"]')` con `not.toBeNull()` (positivo) y `toBeNull()` (regresión) con compañero no-vacío; sin tautologías, ghost loops ni smoke-only.

### Quality Metrics

**Linter**: ➖ Not run in this verification (apply-progress reportó 0 errores en changed files).
**Type Checker**: ✅ Build (`next build`) compiló TypeScript sin errores (exit 0).

### Issues Found

**CRITICAL**: None
**WARNING**: None
**SUGGESTION**:
- Añadir un test de integración que monte `ModelPicker` con `catalog = { "opencode-zen": {...} }`, `connectedProviders=["opencode-zen"]`, `initialProvider="opencode-zen"` y afirme el marker visible, para cerrar literalmente el REQ-2 de models-page (hoy cubierto por composición unit + integración id-agnóstica).
- Advertencias `act(...)` preexistentes en `DashboardLayout` y `clientIntegration` (fuera del alcance de este change, no bloqueantes).

### Verdict

PASS — El marcador verde es visible con el selector cerrado en ambas superficies (`ModelPicker` y `OrchestratorPicker`), el mapeo `opencode-zen` está corregido, y las 7/7 tareas están completas con `npx vitest run` (657/657) y `npm run build` (exit 0) en verde. 3/3 requisitos y 7/7 escenarios cumplidos; sin bloqueos ni hallazgos críticos.
