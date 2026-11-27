# Propuesta: profile-edit-hydration

## Intención

Al iniciar la edición de un perfil, `editAssignments` arranca vacío porque no existe un endpoint GET de detalle. El usuario puede sobrescribir —o perder silenciosamente— asignaciones guardadas que no están en el catálogo activo. El problema está confirmado en código y en pruebas (34/34 pasan sin detectarlo).

## Alcance

### En Alcance
- Endpoint `GET /api/profiles/:name` que devuelve todas las asignaciones persistidas del perfil
- Hidratación de `editAssignments` al entrar en modo edición (solo tras respuesta exitosa)
- Estados de carga y error en la UI durante la obtención del detalle
- Semántica completa del `PUT`: enviar estado hidratado + cambios, nunca `{}`
- Flujo cancelar: descartar estado local sin llamar a la API
- Conservación obligatoria de asignaciones fuera del catálogo: visibles, modificables, nunca eliminadas
- Audit mode: sin GET real, sin save/cancel mutativos; usa fixtures existentes
- Pruebas de ruta, adaptador y UI para los escenarios nuevos

### Fuera de Alcance
- Reemplazar la semántica merge del adaptador por reemplazo total (evaluación futura)
- Rediseño visual del formulario de edición
- Unificación del catálogo de variantes entre `opencode.json` y `opencode.jsonc`

## Capacidades

> Contrato para sdd-spec: qué archivos spec crear o actualizar.

### Capacidades Nuevas
- `profile-detail-endpoint`: endpoint GET `/api/profiles/:name` con contrato completo de asignaciones

### Capacidades Modificadas
- `profiles-page`: hidratación al editar, estados carga/error, conservación de datos fuera de catálogo, flujo save/cancel/audit mode

## Enfoque

1. Agregar `GET /api/profiles/:name` en la ruta existente (actualmente solo `PUT`, `DELETE`, `OPTIONS`). Reutiliza el mapeo del adaptador (`opencode.ts`) para normalizar agentes a `{ agentKey, provider, model, variant }`.
2. Agregar `getProfileDetail(name)` en `profilesApiService.ts`.
3. En `profilesClient.tsx`, reemplazar `handleEditStart` para llamar al detalle, manejar carga/error y poblar `editAssignments` solo si la respuesta es exitosa.
4. En `profilesClientView.tsx`, renderizar indicador de carga y banner de error durante la obtención; bloquear guardar mientras carga o falla.
5. El `PUT` envía el estado hidratado completo; asignaciones no modificadas se incluyen explícitamente para preservarlas.
6. Asignaciones cuyo modelo/variante no aparezcan en el catálogo activo se representan con badge "fuera de catálogo" pero permanecen editables y se incluyen en el payload.

## Áreas Afectadas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `src/app/api/profiles/[name]/route.ts` | Modificado | Agregar handler `GET` |
| `src/adapters/opencode.ts` | Modificado | Exponer función de lectura de detalle de perfil |
| `src/services/profilesApiService.ts` | Modificado | Agregar `getProfileDetail` |
| `src/components/organisms/ProfilesClient/profilesClient.tsx` | Modificado | Hidratación, estados de carga/error |
| `src/components/organisms/ProfilesClient/profilesClientView.tsx` | Modificado | UI de carga/error, badge fuera de catálogo |
| `src/app/api/profiles/[name]/__tests__/route.test.ts` | Modificado | Pruebas del contrato GET |
| `src/components/organisms/ProfilesClient/__tests__/profilesClientView.test.tsx` | Modificado | Pruebas de hidratación, cancelación, save completo |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| PUT parcial sobrescribe intención del usuario | Media | Definir en spec: el payload DEBE incluir todas las asignaciones hidratadas |
| Parseo de clave de fase con guiones produce mapeo erróneo | Media | Reutilizar el mapeo del adaptador; prohibir parseo ad-hoc |
| Valor persistido ausente del catálogo se pierde silenciosamente | Alta | Regla de negocio explícita: conservar siempre, mostrar badge |
| Tests existentes pasan sin detectar regresión | Alta | Agregar escenarios obligatorios de hidratación antes de implementar |

## Plan de Reversión

Revertir los cambios en `route.ts` y `profilesClient.tsx` restaura el comportamiento actual (edición sin hidratación). No hay migración de datos: `opencode.json` no se modifica por esta propuesta. El backup existente generado por `writeOpenCodeConfig` cubre cualquier escritura accidental.

## Dependencias

- El adaptador `opencode.ts` debe ser capaz de leer el detalle completo de un perfil sin mutación (confirmado en exploración: `updateProfile` hace merge; la lectura está disponible)

## Criterios de Éxito

- [ ] `GET /api/profiles/:name` devuelve todas las asignaciones persistidas, incluyendo las fuera del catálogo
- [ ] Al entrar en edición, `editAssignments` se puebla con el detalle real (no `{}`)
- [ ] Asignaciones fuera del catálogo aparecen con badge y se conservan en el PUT
- [ ] Cancelar no llama a la API ni muta el estado persistido
- [ ] Audit mode no hace GET real ni habilita save/cancel mutativos
- [ ] Pruebas nuevas cubren: carga exitosa, error de red, cancelación sin PUT, save con asignaciones no tocadas
