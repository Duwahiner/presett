# Delta for profiles-page

## MODIFIED Requirements

### Requirement: Edición hidratada con bloqueo de guardado

El sistema MUST solicitar el detalle completo antes de entrar en edición, poblar `editAssignments` solo tras respuesta exitosa y bloquear el guardado mientras el detalle carga o falla. Para Base, la identidad explícita MUST resolverse sin perder su asignación `gentle-orchestrator`.
(Previously: la hidratación aplicaba a perfiles existentes, pero Base no tenía identidad explícita ni detalle propio.)

#### Scenario: La edición se hidrata con detalle real
- GIVEN el usuario inicia edición de un perfil existente
- WHEN el detalle responde correctamente
- THEN el formulario muestra las asignaciones persistidas
- AND no se inicia con `{}`

#### Scenario: Base hidrata su asignación persistida
- GIVEN el usuario inicia edición del perfil Base
- WHEN el detalle de Base responde correctamente
- THEN `editAssignments` incluye `gentle-orchestrator`
- AND no se sobrescriben perfiles con nombre

#### Scenario: Carga o error bloquean guardar
- GIVEN el detalle está cargando o falló
- WHEN el usuario intenta guardar
- THEN el sistema impide la mutación
- AND conserva el estado de error o carga visible

## ADDED Requirements

### Requirement: Los perfiles con nombre se preservan al hidratar Base

The system MUST keep named profiles and their assignments unchanged while hydrating Base detail.

#### Scenario: Base no muta perfiles nombrados
- GIVEN existen perfiles con nombre y asignaciones persistidas
- WHEN se abre edición de Base
- THEN los perfiles nombrados permanecen intactos
- AND sus asignaciones no cambian
