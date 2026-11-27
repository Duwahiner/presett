# Models page adoption of v2 system

## ADDED Requirements

### Requirement: Models page adopts the v2 reskin

The system MUST restyle the Models page with the v2 tokens, borders, shadows, and mono navigation treatment.

#### Scenario: Model routing page keeps behavior
- GIVEN the user opens `/models`
- WHEN the page loads
- THEN the page uses the v2 visual system
- AND model-assignment behavior remains available

### Requirement: Existing routing interactions remain intact

The system MUST preserve the current model selection and assignment workflows.

#### Scenario: Assignment flow still works
- GIVEN the user changes a model assignment
- WHEN the change is submitted
- THEN the existing workflow still updates the assignment
- AND the reskin does not change the functional outcome

### Requisito: Las listas de Models page se ordenan de forma determinista
El sistema MUST ordenar localmente las listas de proveedores, modelos y variantes antes de mostrarlas.

#### Escenario: El selector no expone el orden de entrada
- GIVEN el catálogo devuelve elementos en orden distinto
- WHEN el usuario abre Models page
- THEN los selectores muestran un orden estable
- AND la selección no depende del índice original

### Requisito: El marcador de suscripción activa se conserva
El sistema MUST mostrar el marcador visual `bg-success` para proveedores con suscripción activa cuando exista una coincidencia conectada, tanto con el selector abierto como con el selector cerrado.

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
