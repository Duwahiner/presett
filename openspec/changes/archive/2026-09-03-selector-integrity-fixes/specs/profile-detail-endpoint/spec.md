# Delta para profile-detail-endpoint

## REQUISITOS ADICIONADOS

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
