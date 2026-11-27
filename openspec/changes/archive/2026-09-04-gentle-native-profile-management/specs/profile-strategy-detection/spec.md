# Especificación de detección de estrategia de perfiles

## Propósito

Detectar y exponer la estrategia activa de perfiles de Gentle para UI y API.

## Requisitos

### Requisito: El sistema debe detectar la estrategia activa
El sistema MUST clasificar el estado actual como `generated-multi`, `external-single-active` o `unknown` usando los datos locales autoritativos y la capacidad disponible del CLI de Gentle-AI.

#### Escenario: Se detecta generated-multi
- GIVEN `gentle-orchestrator` está presente y existe al menos un perfil `sdd-orchestrator-*`
- WHEN corre la detección
- THEN la estrategia es `generated-multi`

#### Escenario: Se detecta external-single-active
- GIVEN existen perfiles que no coinciden con el contrato generated-multi de Gentle
- WHEN corre la detección
- THEN la estrategia es `external-single-active`

#### Escenario: Se devuelve unknown cuando no hay señal segura
- GIVEN no existe una señal confiable ni soporte CLI usable
- WHEN corre la detección
- THEN la estrategia es `unknown`

### Requisito: El sistema debe exponer la estrategia en modo lectura
El sistema MUST devolver la estrategia detectada sin mutar el estado de perfiles.

#### Escenario: Las respuestas de listado incluyen strategy
- GIVEN se listan los perfiles
- WHEN se construye la respuesta
- THEN la estrategia detectada se incluye
