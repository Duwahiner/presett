# Delta para profiles-page

## ADDED Requirements

### Requisito: La creación de perfil envía solo el orquestador
El sistema MUST enviar al backend únicamente `sdd-orchestrator-<perfil>` al crear un perfil, ignorando fases legacy del formulario o payload.

#### Escenario: Crear perfil no materializa fases extra
- GIVEN el usuario completa la creación de un perfil
- WHEN envía el formulario
- THEN la petición solo incluye el orquestador
- AND el perfil visible no expone fases seleccionables adicionales

### Requisito: Base y otros perfiles permanecen intactos
El sistema MUST preservar el perfil Base y los perfiles existentes durante la creación y migración de perfiles.

#### Escenario: Base sigue disponible tras la migración
- GIVEN existe el perfil Base
- WHEN se ejecuta la migración de perfiles
- THEN Base permanece sin cambios
- AND su `default_agent` sigue siendo válido

#### Escenario: Los perfiles nombrados no se alteran
- GIVEN existen perfiles distintos de Base
- WHEN se crea un nuevo perfil o se limpia la migración legacy
- THEN los perfiles existentes conservan su identidad
- AND sus asignaciones no se sobrescriben
