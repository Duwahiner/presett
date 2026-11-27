# Diseño: profile-edit-hydration

## Enfoque Técnico

Agregar `getProfileDetail(config, name)` al adaptador como lectura pura (sin mutación), exponer `GET /api/profiles/:name` en la ruta dinámica existente, añadir `getProfileDetail` al servicio API y actualizar `ProfilesClient` para hidratar `editAssignments` con el detalle real. El estado de carga/error y el anti-race se controlan con `detailRequestRef` (`useRef<number>`). Referencias: spec `profile-detail-endpoint` y `profiles-page`.

## Decisiones de Arquitectura

| Decisión | Opción elegida | Alternativas rechazadas | Justificación |
|----------|---------------|------------------------|---------------|
| Lectura de detalle | Nueva `getProfileDetail` en adaptador | Ampliar `listProfiles` con flag | `listProfiles` devuelve solo metadatos de resumen; cambiar su contrato afecta 5 callers. Función dedicada aísla responsabilidades. |
| Semántica PUT | Payload completo del estado hidratado | Patch parcial de cambios | `updateProfile` del adaptador hace merge parcial: si el payload omite una asignación no la elimina, pero tampoco confirma la intención del usuario. Payload completo es predecible y evita drift silencioso. |
| Anti-race en `handleEditStart` | Contador de solicitud en `useRef` (`detailRequestRef`) | AbortController | El patrón de ID numérico no requiere propagar `signal` a través de la capa de servicio y cubre doble-click sin infraestructura adicional. |
| Asignaciones fuera de catálogo | Conservar en `editAssignments`, badge visual, incluir en PUT | Filtrar silenciosamente | Filtrar es exactamente el bug que corrige este cambio. Las asignaciones son datos del usuario y deben sobrevivir ciclos de edición. |
| Autorización GET | Sin `requireMutationOrigin` | Aplicar mismo guard del PUT | `requireMutationOrigin` protege escrituras contra CSRF. GET de detalle es lectura pura de `opencode.json`; aplicarlo es innecesario y rompe los tests de integración existentes. |

## Flujo de Datos

```
handleEditStart(name)
  ──→ detailRequestRef++, setDetailLoading(true)
  ──→ getProfileDetail(name)   [service]
        ──→ GET /api/profiles/:name   [route]
              ──→ readOpenCodeConfigSafe → getProfileDetail(config, name)   [adapter]
  ← { name, assignments: Record<agentKey, Assignment> }
  ──→ setEditAssignments(detail.assignments)

handleEditSave()
  ──→ updateProfile(name, editAssignments)   // payload completo hidratado
  ──→ PUT /api/profiles/:name { assignments }

handleEditCancel()
  ──→ limpiar estado local  // sin llamada API

Audit mode: fixtures → sin GET real, sin save/cancel mutativo
```

## Cambios de Archivo

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/adapters/opencode.ts` | Modificar | Agregar `getProfileDetail(config, name): ProfileDetail \| null` usando `isProfileAgent` existente |
| `src/app/api/profiles/[name]/route.ts` | Modificar | Agregar handler `GET` con validación de nombre; actualizar header `Allow` en `OPTIONS` |
| `src/services/profilesApiService.ts` | Modificar | Agregar interfaz `ProfileDetail` y función `getProfileDetail(name)` |
| `src/components/organisms/ProfilesClient/profilesClientTypes.ts` | Modificar | Agregar `detailLoading: boolean`, `detailError: string \| null` a `ProfilesClientViewProps` |
| `src/components/organisms/ProfilesClient/profilesClient.tsx` | Modificar | Reemplazar `handleEditStart` con lógica de detalle + `detailRequestRef`; nuevos estados |
| `src/components/organisms/ProfilesClient/profilesClientView.tsx` | Modificar | Indicador de carga, banner de error, bloqueo de guardar, badge "fuera de catálogo" |
| `src/app/api/profiles/[name]/__tests__/route.test.ts` | Modificar | Agregar tests GET: éxito, perfil inexistente, nombre inválido |
| `src/components/organisms/ProfilesClient/__tests__/profilesClientView.test.tsx` | Modificar | Agregar tests de hidratación, error, cancelación sin PUT, save completo con asignaciones no tocadas |

## Interfaces / Contratos

```typescript
// Adaptador — opencode.ts
interface ProfileDetail {
  name: string;
  assignments: Record<string, { provider: string; model: string; variant: string }>;
}
export function getProfileDetail(config: OpenCodeConfig, name: string): ProfileDetail | null

// Ruta GET /api/profiles/:name
// 200: { name: string; assignments: Record<string, Assignment> }
// 400: { error: { code: "SCHEMA_INVALID"; message: string } }  // nombre inválido
// 404: { error: { code: "NOT_FOUND"; message: string } }       // perfil inexistente

// Servicio — profilesApiService.ts
export async function getProfileDetail(name: string): Promise<ProfileDetail>
```

## Estrategia de Tests

| Capa | Qué probar | Enfoque |
|------|------------|---------|
| Unidad (adaptador) | `getProfileDetail` normaliza agentKeys a assignments; perfil inexistente retorna `null` | Vitest, config inline |
| Integración (ruta) | GET 200 con assignments; 404 perfil ausente; 400 nombre inválido | `PRESETT_TEST_CONFIG_DIR` + handler directo (patrón existente) |
| UI (jsdom) | `handleEditStart` hidrata; save incluye asignaciones no tocadas; cancel no llama PUT; audit no llama GET | Mock de `getProfileDetail` |

**RED tests obligatorios** (deben fallar antes de implementar):
1. `GET /api/profiles/:name` responde 200 con assignments — actualmente 404 (handler ausente)
2. `handleEditStart` deja `editAssignments` poblado — actualmente queda `{}`
3. PUT payload incluye asignaciones hidratadas no modificadas — actualmente solo envía las editadas
4. Asignación fuera de catálogo es visible en UI y se conserva en PUT

## Matriz de Amenazas

Este cambio agrega routing HTTP (`GET /api/profiles/[name]`). El parámetro `:name` llega al sistema de archivos vía `readOpenCodeConfigSafe`. Las filas de la matriz de referencia cubren límites VCS/shell; todas son N/A para este cambio.

| Límite | Aplicabilidad | Razón |
|--------|--------------|-------|
| Rutas tipo documentación / ejecutables | N/A | El parámetro es un nombre de perfil, no una ruta de archivo ni un ejecutable |
| Selección de repositorio git | N/A | Sin operaciones VCS |
| Estado de commit | N/A | Sin operaciones VCS |
| Estado de push | N/A | Sin operaciones VCS |
| Comandos PR | N/A | Sin operaciones VCS |

**Riesgo específico de este routing HTTP — inyección en `:name`:** el adaptador ya valida `/^[a-z0-9_-]+$/` en `updateProfile` y `deleteProfile`. El handler `GET` DEBE aplicar la misma validación y retornar 400 ante nombre inválido.
**RED test:** `GET /api/profiles/../../etc/passwd` → 400, sin lectura de archivo.

## Migración / Rollout

Sin migración de datos. Revertir los cambios en `route.ts` y `profilesClient.tsx` restaura el comportamiento actual. `opencode.json` no se modifica.

## Preguntas Abiertas

- [ ] ¿`ProfileDetail` debe exportarse como tipo público del adaptador o como tipo interno de la ruta?
- [ ] ¿`handleEditSave` debe verificar `detailLoading === false` programáticamente, o el bloqueo de botón en la UI es suficiente garantía?
