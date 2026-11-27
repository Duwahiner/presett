# Delta para profiles-page

## REQUISITOS ADICIONADOS

### Requisito: La Base se muestra como Gentle-Orchestrator
El sistema MUST conservar la identidad interna del perfil Base como `name: ""` y mostrar `displayName: "Gentle-Orchestrator"` en la lista y en el editor de `/profiles`.

#### Escenario: La lista muestra el nombre visible correcto
- GIVEN existe el perfil Base con `name: ""`
- WHEN el usuario abre `/profiles`
- THEN la tarjeta de Base muestra `Gentle-Orchestrator`
- AND la identidad interna sigue siendo `name: ""`

#### Escenario: El editor conserva la identidad y la etiqueta visible
- GIVEN el usuario entra a editar el perfil Base
- WHEN la vista de edición se renderiza
- THEN el título visible usa `Gentle-Orchestrator`
- AND las acciones siguen apuntando al perfil Base por su identidad interna vacía
