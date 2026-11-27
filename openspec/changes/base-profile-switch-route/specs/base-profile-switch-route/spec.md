# Especificación delta de base-profile-switch-route

## Requisitos añadidos

### Requisito: POST reservado para Base

El sistema MUST exponer `POST /api/profiles/base/switch` como alias reservado del perfil Base y resolverlo hacia la identidad canónica `name: ""`.

#### Escenario: Base activa por ruta reservada
- GIVEN el perfil Base existe con identidad vacía
- WHEN el cliente llama `POST /api/profiles/base/switch`
- THEN el sistema activa Base correctamente
- AND responde `{ ok: true }`

#### Escenario: La ruta reservada no altera perfiles nombrados
- GIVEN existe un perfil con nombre distinto de Base
- WHEN el cliente llama `POST /api/profiles/base/switch`
- THEN la operación solo afecta al perfil Base

### Requisito: El alias cliente de switchProfile preserva Base

El sistema MUST resolver `switchProfile("")` mediante el segmento literal `base` sin cambiar el contrato de perfiles nombrados.

#### Escenario: Base usa el alias reservado
- GIVEN el cliente invoca `switchProfile("")`
- WHEN se construye la ruta
- THEN se usa `POST /api/profiles/base/switch`
- AND no se genera un segmento vacío

#### Escenario: Un perfil con nombre sigue codificándose normalmente
- GIVEN el cliente invoca `switchProfile("alpha")`
- WHEN se construye la ruta
- THEN se usa el segmento codificado del nombre
- AND el contrato de perfiles nombrados permanece intacto

### Requisito: Los errores existentes se preservan en el cambio de Base

El sistema MUST mantener el comportamiento de error actual para origin, validación y fallos del adapter al usar la ruta reservada.

#### Escenario: Un origen no permitido se rechaza igual
- GIVEN la solicitud no cumple la política de origen de mutación
- WHEN se llama a la ruta reservada
- THEN la respuesta devuelve el error seguro correspondiente

#### Escenario: Un fallo de esquema sigue devolviendo error
- GIVEN el adapter retorna un error de esquema
- WHEN se procesa la solicitud
- THEN la respuesta conserva el código de error esperado
- AND no se reporta éxito parcial
