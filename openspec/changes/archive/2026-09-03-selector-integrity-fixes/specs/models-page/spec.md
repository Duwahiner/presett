# Delta para models-page

## REQUISITOS ADICIONADOS

### Requisito: Las listas de Models page se ordenan de forma determinista
El sistema MUST ordenar localmente las listas de proveedores, modelos y variantes antes de mostrarlas.

#### Escenario: El selector no expone el orden de entrada
- GIVEN el catálogo devuelve elementos en orden distinto
- WHEN el usuario abre Models page
- THEN los selectores muestran un orden estable
- AND la selección no depende del índice original

### Requisito: El marcador de suscripción activa se conserva
El sistema MUST mostrar el marcador visual `bg-success` para proveedores con suscripción activa cuando exista una coincidencia conectada.

#### Escenario: El proveedor conectado muestra el marcador
- GIVEN existe un proveedor conectado en `connectedProviders`
- WHEN se renderiza `ModelPicker`
- THEN el marcador `bg-success` es visible
- AND su ausencia sigue siendo posible para proveedores no conectados
