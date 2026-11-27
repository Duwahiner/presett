# Delta para models-page

## MODIFIED Requirements

### Requisito: El marcador de suscripción activa se conserva
El sistema MUST mostrar el marcador visual `bg-success` para proveedores con suscripción activa cuando exista una coincidencia conectada, tanto con el selector abierto como con el selector cerrado.
(Previously: solo garantizaba la visibilidad del marcador en el selector abierto.)

#### Escenario: El proveedor conectado muestra el marcador en el trigger cerrado
- GIVEN existe un proveedor conectado en `connectedProviders`
- AND el usuario ya seleccionó ese proveedor
- WHEN `ModelPicker` se renderiza con el selector cerrado
- THEN el trigger muestra el valor seleccionado
- AND el marcador `bg-success` es visible

#### Escenario: El proveedor conectado conserva el marcador al abrir el selector
- GIVEN existe un proveedor conectado en `connectedProviders`
- AND el usuario ya seleccionó ese proveedor
- WHEN el usuario abre `ModelPicker`
- THEN la opción seleccionada muestra el marcador `bg-success`
- AND el trigger sigue mostrando el estado de conexión

### Requisito: OpenCode Zen se normaliza al identificador canónico correcto
El sistema MUST normalizar `OpenCode Zen` a `opencode-zen` para que la suscripción conectada coincida con el catálogo activo.
(Previously: el mapeo canónico no reflejaba el ID real del catálogo.)

#### Escenario: El nombre compuesto resuelve el ID correcto
- GIVEN el usuario conecta un proveedor presentado como `OpenCode Zen`
- WHEN el sistema normaliza el nombre del proveedor
- THEN el valor canónico resultante es `opencode-zen`
- AND la coincidencia puede entrar en `connectedSet`

#### Escenario: El valor normalizado habilita el marcador
- GIVEN `OpenCode Zen` está en el catálogo y el proveedor está conectado
- WHEN se renderiza `ModelPicker`
- THEN el proveedor aparece como conectado
- AND el marcador `bg-success` es visible
