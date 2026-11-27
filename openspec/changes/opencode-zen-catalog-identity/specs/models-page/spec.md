# Delta for Models page

## MODIFIED Requirements

### Requirement: OpenCode Zen se normaliza al identificador canónico correcto

El sistema MUST normalizar `OpenCode Zen` a `opencode-zen` para que la suscripción conectada coincida con el catálogo activo y la UI pueda mostrar la etiqueta de producto correcta.
(Previously: El requisito solo garantizaba que `OpenCode Zen` resolviera `opencode-zen` para que la coincidencia entrara en `connectedSet`.)

#### Scenario: El nombre compuesto resuelve el ID correcto
- GIVEN el usuario conecta un proveedor presentado como `OpenCode Zen`
- WHEN el sistema normaliza el nombre del proveedor
- THEN el valor canónico resultante es `opencode-zen`
- AND la coincidencia puede entrar en `connectedSet`

#### Scenario: La etiqueta visible usa el nombre de producto
- GIVEN el proveedor canónico es `opencode-zen`
- WHEN `ModelPicker` renderiza la opción
- THEN la etiqueta visible es `OpenCode Zen`
- AND el valor interno sigue siendo `opencode-zen`

#### Scenario: El valor normalizado habilita el marcador
- GIVEN `OpenCode Zen` está en el catálogo y el proveedor está conectado
- WHEN se renderiza `ModelPicker`
- THEN el proveedor aparece como conectado
- AND el marcador `bg-success` es visible
