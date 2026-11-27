# Especificación de UI de asignación por fase

## Propósito

Presentar asignaciones por fase sólo para perfiles `generated-multi`.

## Requisitos

### Requisito: El sistema debe mostrar controles por fase para generated-multi
El sistema MUST renderizar asignaciones por fase editables cuando la estrategia activa sea `generated-multi`.

#### Escenario: Generated-multi expone controles de fase
- GIVEN la estrategia es `generated-multi`
- WHEN se abre el editor del perfil
- THEN las 10 asignaciones de fase son visibles y editables

### Requisito: El sistema debe ocultar la edición por fase para unknown
El sistema MUST no mostrar controles de edición por fase cuando la estrategia sea `unknown`.

#### Escenario: Unknown oculta la sección de fases
- GIVEN la estrategia es `unknown`
- WHEN se abre el editor del perfil
- THEN la sección de asignación por fase no se renderiza
