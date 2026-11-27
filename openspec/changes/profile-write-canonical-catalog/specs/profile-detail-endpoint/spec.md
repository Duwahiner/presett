# Delta for profile-detail-endpoint

## ADDED Requirements

### Requirement: Escritura de perfiles usa el catálogo canónico compartido

El sistema MUST validar `POST /api/profiles`, `PUT /api/profiles/:name` y `PUT /api/profiles/base` contra el mismo catálogo canónico que usa la UI.

#### Scenario: Un modelo OpenCode Zen se acepta en todas las rutas de escritura
- GIVEN el catálogo canónico expone un modelo `opencode-zen`
- WHEN el cliente guarda un perfil o Base con ese modelo
- THEN la operación se acepta
- AND la validación usa el mismo catálogo que la UI

#### Scenario: Un error real de catálogo sigue devolviendo 400
- GIVEN el catálogo no contiene el modelo solicitado
- WHEN el cliente intenta guardar el perfil o Base
- THEN la respuesta es HTTP 400
- AND el error refleja una falla real de catálogo, no un mismatch de catálogo legacy

### Requirement: Proveedores legacy y canónico son compatibles al validar

El sistema MUST aceptar entradas de proveedor legacy y canónico como equivalentes durante la validación de escritura.

#### Scenario: Un proveedor legacy se resuelve contra el catálogo canónico
- GIVEN una asignación llega con el identificador legacy del proveedor
- WHEN la ruta de escritura valida la entrada
- THEN la asignación se resuelve contra el catálogo canónico
- AND no se rechaza por diferencia de nomenclatura

#### Scenario: Un proveedor canónico también se acepta
- GIVEN una asignación llega con el identificador canónico del proveedor
- WHEN la ruta de escritura valida la entrada
- THEN la asignación se acepta si existe en el catálogo
- AND el comportamiento coincide con la UI

## MODIFIED Requirements

### Requirement: La variante es opcional solo para modelos sin variantes

El sistema MUST aceptar ausencia de `variant` cuando el modelo seleccionado no tenga variantes y MUST rechazar variantes desconocidas. La validación MUST consultar el catálogo canónico compartido con la UI para determinar variantes válidas.

(Previously: The system accepted missing `variant` for models without variants and rejected unknown variants.)

#### Scenario: Un modelo sin variantes guarda sin `variant`
- GIVEN el modelo seleccionado no tiene variantes
- WHEN el cliente persiste el perfil sin `variant`
- THEN la operación se acepta
- AND el payload se almacena sin esa propiedad

#### Scenario: Una variante desconocida se rechaza
- GIVEN el usuario envía una variante no presente en el catálogo canónico
- WHEN se valida el perfil
- THEN el sistema rechaza la asignación
- AND no persiste un valor inválido
