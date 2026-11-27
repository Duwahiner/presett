# Delta para models-page

## MODIFIED Requirements

### Requisito: El marcador de suscripción activa se conserva

El sistema MUST mostrar el marcador visual `bg-success` solo cuando exista una coincidencia conectada válida para el proveedor mostrado.

(Previously: el marcador se mostraba para proveedores con suscripción activa cuando existía una coincidencia conectada, tanto con el selector abierto como con el selector cerrado.)

#### Escenario: OpenCode conectado muestra el marcador
- GIVEN existe una señal conectada `opencode-zen`
- AND el proveedor del catálogo es `opencode`
- WHEN `ModelPicker` se renderiza
- THEN el proveedor se muestra como conectado
- AND el marcador `bg-success` es visible

#### Escenario: Sin Zen no hay marcador
- GIVEN el proveedor del catálogo es `opencode`
- AND no existe la señal conectada `opencode-zen`
- WHEN `ModelPicker` se renderiza
- THEN el proveedor se muestra sin estado de conexión
- AND el marcador `bg-success` no aparece

### Requisito: OpenCode Zen se normaliza al identificador canónico correcto

El sistema MUST correlacionar la señal conectada `opencode-zen` con el proveedor de catálogo `opencode` sin cambiar el ID técnico persistido.

(Previously: el sistema normalizaba `OpenCode Zen` a `opencode-zen` para que la suscripción conectada coincidiera con el catálogo activo.)

#### Escenario: La señal conectada resuelve el proveedor técnico
- GIVEN la lista conectada contiene `opencode-zen`
- WHEN el sistema evalúa el catálogo
- THEN el proveedor técnico sigue siendo `opencode`
- AND la coincidencia visual usa la etiqueta `OpenCode Zen`

#### Escenario: El catálogo no cambia de ID
- GIVEN el proveedor técnico es `opencode`
- WHEN se renderiza el selector
- THEN el ID mostrado al sistema continúa siendo `opencode`
- AND no se introduce `opencode-zen` como clave de catálogo
