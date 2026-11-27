# Propuesta: profile-base-detail-hydration

## Intención

El perfil Base se representa internamente como `name: ""`. El flujo de hidratación general (`profile-edit-hydration`, archivado) asume que el nombre del perfil puede usarse como segmento de ruta: `GET /api/profiles/${encodeURIComponent(name)}`. Para Base, `encodeURIComponent("")` produce `""`, lo que hace que la ruta colapse a `GET /api/profiles/` (la ruta de listado) o que el adaptador rechace el nombre vacío antes de llegar al sistema de archivos. El resultado es que Base siempre inicia sin su `gentle-orchestrator` persistido.

## Alcance

### En Alcance
- Contrato explícito de detalle para el perfil Base (`name: ""`) a través de un segmento reservado `/base`
- Modificación del adaptador para aceptar la clave canónica `""` y resolverla al perfil Base real
- Hidratación de `editAssignments` cuando el perfil activo es Base (igual que perfiles con nombre)
- Conservación de nombres de perfiles existentes y sus asignaciones — ninguna clave se renombra
- No sobrescribir asignaciones de otros perfiles ni mutar `opencode.json` salvo al guardar Base
- Pruebas: ruta `/api/profiles/base`, adaptador con nombre vacío, comportamiento del cliente para Base

### Fuera de Alcance
- Renombrar el perfil Base a un nombre no vacío en `opencode.json`
- Cambiar la representación interna `name: ""` en el resto del sistema
- Migración del orquestador almacenado bajo clave vacía

## Capacidades

> Contrato para sdd-spec.

### Capacidades Nuevas
- `base-profile-detail-endpoint`: ruta `GET /api/profiles/base` que resuelve el detalle del perfil Base (`name: ""`) sin requerir un nombre de segmento no vacío

### Capacidades Modificadas
- `profile-detail-endpoint`: el adaptador `getProfileDetail` acepta `""` como alias del perfil Base; delega internamente al nuevo endpoint o al mismo lector con nombre resuelto
- `profiles-page`: el cliente detecta `name === ""` y construye la URL de detalle como `/api/profiles/base` en lugar de `/api/profiles/`

## Enfoque

1. Agregar `GET /api/profiles/base/route.ts` (nueva ruta estática, antes que `[name]`) que llama al adaptador con el identificador interno del perfil Base.
2. Modificar `getProfileDetail(name)` en `profilesApiService.ts` para que, cuando `name === ""`, haga `GET /api/profiles/base`.
3. Modificar `handleEditStart` en `profilesClient.tsx` para calcular la URL correcta antes de llamar al servicio.
4. El adaptador recibe el perfil Base por su posición/convención en `opencode.json`, no por clave de nombre — sin asumir que `""` sea un segmento de path válido.
5. Pruebas de ruta `/base`, pruebas del servicio con nombre vacío y pruebas del cliente para el flujo de Base.

## Áreas Afectadas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `src/app/api/profiles/base/route.ts` | Nuevo | Handler `GET` estático para Base |
| `src/adapters/opencode.ts` | Modificado | Resolución del perfil Base por convención, no por nombre de segmento |
| `src/services/profilesApiService.ts` | Modificado | Alias `""` → `/api/profiles/base` |
| `src/components/organisms/ProfilesClient/profilesClient.tsx` | Modificado | URL de detalle condicional para Base |
| `src/app/api/profiles/base/__tests__/route.test.ts` | Nuevo | Pruebas del contrato GET /base |
| `src/components/organisms/ProfilesClient/__tests__/profilesClient.test.tsx` | Modificado | Hidratación de Base con orquestador persistido |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Ruta `/base` entra en conflicto con un perfil de usuario llamado "base" | Baja | Validar en `PUT /api/profiles` que "base" es nombre reservado; documentar en spec |
| Adaptador resuelve posición 0 pero el orden de perfiles es inestable | Media | Resolver por convención de nombre `""` en el JSON, no por índice |
| Pruebas del cambio archivado pasan pero no cubren el caso `name: ""` | Alta | Añadir escenarios explícitos de Base antes de implementar |

## Plan de Reversión

Eliminar `src/app/api/profiles/base/route.ts` y revertir el alias en `profilesApiService.ts` restaura el comportamiento anterior: Base no hidrata pero tampoco rompe otros perfiles. Sin migración de datos.

## Dependencias

- Cambio archivado `profile-edit-hydration` ya implementado: la hidratación general funciona para perfiles con nombre. Esta propuesta extiende ese contrato solo para el caso Base.

## Criterios de Éxito

- [ ] `GET /api/profiles/base` devuelve todas las asignaciones del perfil Base incluido `gentle-orchestrator`
- [ ] Al entrar en edición de Base, `editAssignments` contiene la asignación del orquestador persistida
- [ ] Ningún perfil con nombre se ve afectado por la nueva ruta
- [ ] "base" queda documentado como nombre de perfil reservado en la API
- [ ] Pruebas nuevas cubren: GET Base exitoso, Base con orquestador persistido, edición que hidrata, cancelación sin PUT
