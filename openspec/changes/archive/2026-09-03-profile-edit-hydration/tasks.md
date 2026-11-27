# Tasks: profile-edit-hydration

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 150-250 |
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
| 1 | Infraestructura + Servicio | PR 1 | `npm test route.test.ts` | Endpoint `GET /api/profiles/:name` | Revert route/service changes |
| 2 | UI Hidratación + Conservación | PR 1 | `npm test profilesClientView.test.tsx` | UI Edición Hidratada | Revert UI/Client changes |

## Phase 1: Foundation (Infraestructura)

- [x] 1.1 Implementar `getProfileDetail` en `src/adapters/opencode.ts` (lectura pura, retorno `ProfileDetail`).
- [x] 1.2 Agregar handler `GET` en `src/app/api/profiles/[name]/route.ts` con validación de nombre (path traversal) y llamado a `getProfileDetail`.
- [x] 1.3 Agregar `getProfileDetail` en `src/services/profilesApiService.ts`.
- [x] 1.4 **RED Test**: Crear prueba unitaria para `GET /api/profiles/:name` que falle (espera 200, recibe 404).

## Phase 2: Core Implementation (UI Hidratación)

- [x] 2.1 Modificar `ProfilesClientViewProps` en `src/components/organisms/ProfilesClient/profilesClientTypes.ts` (agregar `detailLoading`, `detailError`).
- [x] 2.2 Refactorizar `src/components/organisms/ProfilesClient/profilesClient.tsx`: `handleEditStart` con `detailRequestRef`, hidratación de `editAssignments` y estados de carga/error.
- [x] 2.3 Actualizar `src/components/organisms/ProfilesClient/profilesClientView.tsx`: UI de carga, banners de error, bloqueo de botones durante `detailLoading`, visualización badge "fuera de catálogo".
- [x] 2.4 Ajustar `handleEditSave` en `ProfilesClient` para enviar payload completo (estado hidratado + cambios).

## Phase 3: Testing & Audit

- [x] 3.1 **RED Test**: `handleEditStart` test → verifica `editAssignments` no sea `{}` tras hidratación.
- [x] 3.2 **RED Test**: `profilesClientView` test → verifica PUT payload incluye asignaciones hidratadas sin modificar.
- [x] 3.3 **RED Test**: `profilesClientView` test → verifica asignación "fuera de catálogo" visible y preservada.
- [x] 3.4 **RED Test**: Prueba Path Traversal (`GET /api/profiles/../../etc/passwd`) → verifica respuesta 400.
- [x] 3.5 **RED Test**: Audit Mode test → verifica uso de fixtures y ausencia de GET real.
- [x] 3.6 Verificar cancelación: test que confirme no llamada a API y limpieza de estado local.
