# Especificación de delegación de perfiles a Gentle-AI

## Propósito

Delegar las escrituras nativas de perfiles al CLI de Gentle-AI cuando la estrategia activa es `generated-multi`.

## Requisitos

### Requisito: El sistema debe delegar las escrituras nativas al CLI de Gentle-AI
El sistema MUST usar operaciones del CLI de Gentle-AI para crear y actualizar cuando la estrategia sea `generated-multi`.

#### Escenario: La creación delega al sync de perfil
- GIVEN la estrategia activa es `generated-multi`
- WHEN se crea un perfil
- THEN el sistema invoca el flujo de sync de Gentle-AI

#### Escenario: La actualización de fases delega al sync de fase
- GIVEN la estrategia activa es `generated-multi`
- WHEN cambia una asignación de fase
- THEN el sistema invoca el flujo de sync de fase de Gentle-AI

### Requisito: El sistema debe mantener inmutable a gentle-orchestrator
El sistema MUST no renombrar, eliminar ni reescribir `gentle-orchestrator` por operaciones de perfil.

#### Escenario: Las operaciones nativas preservan el agente base
- GIVEN las operaciones corren en modo generated-multi
- WHEN termina una creación o actualización
- THEN `gentle-orchestrator` permanece sin cambios
