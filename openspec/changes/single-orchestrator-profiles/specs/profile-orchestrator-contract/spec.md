# Especificación de profile-orchestrator-contract

## Propósito

Un perfil debe materializar exactamente un agente visible: su orquestador. Las fases legacy no deben persistirse como agentes seleccionables.

## Requisitos

### Requisito: Un perfil persiste solo su orquestador
El sistema MUST guardar únicamente `sdd-orchestrator-<perfil>` como agente visible del perfil.

#### Escenario: La creación normal persiste un solo agente
- GIVEN el usuario crea un perfil nuevo
- WHEN el perfil se guarda
- THEN solo queda persistido `sdd-orchestrator-<perfil>`
- AND no existen entradas `sdd-<fase>-<perfil>`

#### Escenario: Las fases legacy se rechazan como persistencia visible
- GIVEN una payload contiene claves de fase legacy
- WHEN el sistema procesa el alta o la edición
- THEN esas claves no se persisten como agentes visibles
- AND el perfil conserva su orquestador

### Requisito: La migración limpia fases legacy de forma atómica
El sistema MUST migrar perfiles existentes con backup previo, eliminación de fases legacy y escritura atómica.

#### Escenario: La migración conserva Base y default_agent
- GIVEN existen perfiles con fases legacy
- WHEN corre la migración
- THEN se crea backup antes de modificar datos
- AND se conservan `orchestrator`, `model` y `default_agent`

#### Escenario: Una migración fallida no deja el perfil a medias
- GIVEN ocurre un error durante la migración
- WHEN el proceso aborta
- THEN el estado previo permanece recuperable desde el backup
- AND no queda una mezcla parcial de fases nuevas y viejas
