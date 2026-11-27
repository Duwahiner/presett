# Delta para profile-management

## REQUISITOS AÑADIDOS

### Requisito: external-single-active es de solo lectura
El sistema MUST tratar `external-single-active` como solo lectura para toda mutación de perfiles.

#### Escenario: La creación se bloquea en modo externo
- GIVEN la estrategia es `external-single-active`
- WHEN el usuario intenta crear un perfil
- THEN la operación se rechaza

#### Escenario: La actualización y eliminación se bloquean en modo externo
- GIVEN la estrategia es `external-single-active`
- WHEN el usuario intenta actualizar o eliminar un perfil
- THEN la operación se rechaza

### Requisito: Los perfiles generated-multi incompletos son reparables
El sistema MUST detectar perfiles generated-multi que perdieron agentes de fase tras cambios locales y ofrecer una ruta de reparación.

#### Escenario: La falta de agentes de fase marca el perfil como incompleto
- GIVEN existe `sdd-orchestrator-*` sin sus agentes de fase correspondientes
- WHEN se cargan los perfiles
- THEN el perfil se marca como incompleto

#### Escenario: La reparación restaura los agentes de fase faltantes
- GIVEN un perfil generated-multi incompleto fue seleccionado para reparar
- WHEN la reparación termina con éxito
- THEN se restauran los agentes de fase faltantes
- AND el perfil deja de estar incompleto

### Requisito: Las mutaciones de perfil conservan una ruta de rollback
El sistema MUST guardar un estado previo recuperable antes de cualquier reparación local o escritura directa de perfil.

#### Escenario: Una reparación fallida puede revertirse
- GIVEN una reparación o escritura comenzó
- WHEN la operación falla
- THEN el estado previo sigue siendo recuperable

#### Escenario: El rollback restaura el estado anterior del perfil
- GIVEN debe revertirse un cambio de perfil
- WHEN se solicita rollback
- THEN se restaura el estado previo del perfil
