# Especificación de profile-detail-endpoint

## Propósito

Exponer el detalle completo de un perfil para permitir edición hidratada sin perder asignaciones persistidas.

## Requisitos

### Requisito: GET de detalle completo de perfil

El sistema MUST devolver `GET /api/profiles/:name` con todas las asignaciones persistidas del perfil, no solo metadatos resumidos.

#### Escenario: El detalle devuelve todas las asignaciones
- GIVEN existe un perfil con asignaciones en el almacenamiento
- WHEN el cliente solicita `GET /api/profiles/:name`
- THEN la respuesta incluye el perfil y todas sus asignaciones persistidas
- AND conserva las entradas fuera del catálogo activo

#### Escenario: El detalle preserva claves de asignación
- GIVEN un perfil contiene orquestador y fases configuradas
- WHEN se consulta el detalle
- THEN cada asignación aparece con su clave estable y sus campos completos

### Requisito: Perfil inexistente retorna error

El sistema MUST responder con error cuando el perfil solicitado no exista.

#### Escenario: Perfil ausente
- GIVEN no existe un perfil con ese nombre
- WHEN el cliente solicita `GET /api/profiles/:name`
- THEN la respuesta indica que el perfil no existe
- AND no devuelve un detalle parcial
