# Especificación delta para profile-deletion-safety

## Requisitos ADDED

### Requisito: Base es indestructible
El sistema MUST rechazar cualquier intento de borrar el perfil Base y cualquier nombre reservado.

#### Escenario: Base se rechaza por nombre reservado
- GIVEN el nombre solicitado es `base` o pertenece a `RESERVED_PROFILE_NAMES`
- WHEN se invoca la eliminación
- THEN el sistema devuelve error de validación
- AND no modifica la configuración

#### Escenario: Un nombre vacío también se rechaza
- GIVEN el nombre solicitado está vacío
- WHEN se invoca la eliminación
- THEN el sistema devuelve error de validación
- AND no realiza escrituras

### Requisito: La eliminación del perfil activo restaura el agente por defecto
El sistema MUST restaurar `default_agent` a `gentle-orchestrator` en la misma escritura cuando se elimina el perfil activo.

#### Escenario: El perfil activo se elimina con restauración atómica
- GIVEN el perfil eliminado coincide con el agente activo `sdd-orchestrator-{name}`
- WHEN se confirma la eliminación
- THEN `default_agent` pasa a `gentle-orchestrator`
- AND ambos cambios persisten juntos

#### Escenario: Un perfil inactivo no cambia el agente por defecto
- GIVEN el perfil eliminado no coincide con el agente activo
- WHEN se confirma la eliminación
- THEN `default_agent` permanece sin cambios

### Requisito: La API rechaza Base antes del adaptador
El sistema MUST devolver 400 al borrar `DELETE /api/profiles/base` antes de llamar al adaptador.

#### Escenario: DELETE sobre Base retorna 400
- GIVEN la ruta recibe `name === "base"`
- WHEN se procesa DELETE
- THEN la respuesta es 400
- AND no se invoca eliminación de perfil
