# Apply Progress: profile-edit-hydration

**Modo**: Strict TDD (config `testing.strict_tdd: true`, runner Vitest)
**Delivery**: `ask-on-risk` → Forecast Low → PR individual autorizado (single PR). `Decision needed before apply: No`.
**Estado**: 10/10 tasks completas.

## Completed Tasks

- [x] 1.1 `getProfileDetail` en `src/adapters/opencode.ts` (lectura pura, retorno `ProfileDetail`).
- [x] 1.2 Handler `GET` en `src/app/api/profiles/[name]/route.ts` con validación de nombre y header `Allow` actualizado en `OPTIONS`.
- [x] 1.3 `getProfileDetail` en `src/services/profilesApiService.ts`.
- [x] 1.4 RED Test `GET /api/profiles/:name` (200 con assignments; 404 perfil ausente; 400 nombre inválido).
- [x] 2.1 `ProfilesClientViewProps`: agregados `detailLoading`, `detailError`.
- [x] 2.2 `profilesClient.tsx`: `handleEditStart` con `detailRequestRef` (anti-race), hidratación de `editAssignments`, estados carga/error.
- [x] 2.3 `profilesClientView.tsx`: indicador de carga, banner de error, bloqueo de guardar durante `detailLoading`/error, badge "fuera de catálogo", formulario itera asignaciones.
- [x] 2.4 `handleEditSave` envía payload completo hidratado y bloquea mutación si falta el detalle.
- [x] 3.1 RED Test: hidratación (editAssignments != {}).
- [x] 3.2 RED Test: PUT incluye asignaciones hidratadas sin tocar.
- [x] 3.3 RED Test: asignación fuera de catálogo visible (badge) y preservada en PUT.
- [x] 3.4 RED Test: path traversal → 400.
- [x] 3.5 RED Test: audit mode sin GET real ni mutación.
- [x] 3.6 RED Test: cancelar no llama API y limpia estado local.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|------------|-----|-------|-------------|----------|
| 1.1 getProfileDetail | `src/adapters/__tests__/profiles.test.ts` | Unit | ✅ 5/5 | ✅ Written | ✅ 9/9 | ✅ 4 cases (éxito, out-of-catalog, inexistente, path traversal) | ✅ Clean |
| 1.2 GET route | `src/app/api/profiles/[name]/__tests__/route.test.ts` | Integration | ✅ 5/5 | ✅ Written | ✅ 8/8 | ✅ 3 casos (200, 404, 400) | ✅ Clean |
| 1.3 service | `src/services/__tests__/profilesApiService.test.ts` | Unit | ✅ 4/4 | ✅ Written | ✅ 5/5 | ✅ 1 caso + ruta | ✅ Clean |
| 2.1–2.4 hidratación | `src/components/organisms/ProfilesClient/__tests__/profilesClient.test.tsx` | Integration (jsdom) | N/A (nuevo) | ✅ Written | ✅ 7/7 | ✅ 7 casos (hidratación, PUT completo, out-of-catalog, cancel, carga bloquea, error bloquea, audit) | ✅ Clean |
| 2.3 view UI | `src/components/organisms/ProfilesClient/__tests__/profilesClientView.test.tsx` | Integration (jsdom) | ✅ 24/24 | ✅ Written | ✅ 36/36 | ✅ 12 casos nuevos (carga, error, badge in/out, helpers) | ✅ Clean |

## Test Summary

- **Total tests escritos**: 27 (4 adapter + 1 service + 3 route + 7 container + 12 view/pure)
- **Total tests pasando**: 27/27
- **Suites**: 80 files / 606 tests passing (sin regresiones)
- **Layers**: Unit (10), Integration/handler (3), Integration/jsdom (14)
- **Pure functions creadas**: `getProfileDetail` (adapter), `isOutsideCatalog`, `assignmentLabel` (view)
- **Typecheck**: `npx tsc --noEmit` ✅ limpio
- **Lint**: ✅ en todos los archivos tocados (único error es pre-existente, `react-hooks/set-state-in-effect` en `profilesClient.tsx:135`, audit short-circuit no modificado por este cambio)

## Work Unit Evidence

| Evidence | Unit 1 (Infra + Servicio) | Unit 2 (UI Hidratación + Conservación) |
|----------|---------------------------|----------------------------------------|
| Focused test command + result | `npx vitest run route.test.ts profiles.test.ts profilesApiService.test.ts` → 22/22 pass | `npx vitest run profilesClient.test.tsx profilesClientView.test.tsx` → 43/43 pass |
| Runtime harness + result | Handler `GET /api/profiles/:name` real (handler directo + `opencode.json` real en temp dir via `PRESETT_TEST_CONFIG_DIR`): 200 con assignments, 404, 400. E2E navegador N/A (proyecto usa Vitest/jsdom; no hay harness E2E para perfiles en el stack). | `ProfilesClient` real + view harness en jsdom con `getProfileDetail` mockeado: hidratación, PUT completo, cancel, audit, bloqueo carga/error. Browser harness N/A por stack Vitest/jsdom. |
| Rollback boundary | Revertir `route.ts` y `profilesApiService.ts` | Revertir `profilesClient.tsx`, `profilesClientView.tsx`, `profilesClientTypes.ts` |

## Deviations from Design

- El formulario de edición pasó de editar solo la asignación orquestadora a **iterar todas las asignaciones hidratadas** (`Object.entries(editAssignments)`). Necesario para cumplir el escenario spec "Asignación fuera de catálogo sigue visible y editable" y "Guardado incluye asignaciones no tocadas"; el diseño previo solo renderizaba el orquestador.
- `handleEditSave` además de payload completo añade guarda programática `detailLoading || detailError` (responde la pregunta abierta del diseño a favor de doble garantía UI + lógica).
- `clientIntegration.test.tsx` (no listado en áreas afectadas) requirió añadir `getProfileDetail` al mock del servicio, porque `ProfilesClient` ahora lo importa; sin este ajuste el suite existente rompía.

## Issues Found

- Pre-existente (no introducido): `react-hooks/set-state-in-effect` en `profilesClient.tsx:135` (short-circuit audit). Fuera de alcance.
- Pre-existente: tests de `clientIntegration.test.tsx` emiten warnings de `act(...)` (ya presentes antes).