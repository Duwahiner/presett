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


### Requirement: Detalle de perfil reconoce Base como identidad explícita

The system MUST resolve Base as the canonical empty-name profile while preserving the existing named-profile detail contract.

#### Scenario: Base detail resolves through the reserved identity
- GIVEN the client requests the Base profile detail
- WHEN the reserved Base identity is used
- THEN the system returns the full Base detail
- AND the profile identity remains `name: ""`

#### Scenario: Detail absent still fails
- GIVEN no profile exists for the requested identity
- WHEN detail is requested
- THEN the system returns a not-found error

### Requisito: La variante es opcional solo para modelos sin variantes
El sistema MUST aceptar ausencia de `variant` cuando el modelo seleccionado no tenga variantes y MUST rechazar variantes desconocidas.

#### Escenario: Un modelo sin variantes guarda sin `variant`
- GIVEN el modelo seleccionado no tiene variantes
- WHEN el cliente persiste el perfil sin `variant`
- THEN la operación se acepta
- AND el payload se almacena sin esa propiedad

#### Escenario: Una variante desconocida se rechaza
- GIVEN el usuario envía una variante no presente en el catálogo
- WHEN se valida el perfil
- THEN el sistema rechaza la asignación
- AND no persiste un valor inválido
