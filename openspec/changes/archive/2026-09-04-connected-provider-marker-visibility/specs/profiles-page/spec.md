# Delta para profiles-page

## MODIFIED Requirements

### Requisito: Se conservan asignaciones fuera de catálogo
El sistema MUST mostrar y preservar asignaciones cuyo proveedor, modelo o variante no existan en el catálogo activo, y MUST mantener visible el estado de conexión cuando el proveedor seleccionado siga en `connectedSet`, con el selector abierto y cerrado.
(Previously: solo garantizaba la preservación de asignaciones fuera de catálogo.)

#### Escenario: La asignación fuera de catálogo sigue editable
- GIVEN una asignación persistida no está en el catálogo activo
- WHEN el usuario abre edición
- THEN la asignación sigue visible y editable
- AND se conserva al guardar

#### Escenario: El proveedor conectado muestra el marcador con el selector cerrado
- GIVEN el perfil tiene un proveedor conectado seleccionado
- WHEN el selector de proveedor se renderiza cerrado
- THEN el trigger muestra el valor seleccionado
- AND el marcador verde `bg-success` es visible

#### Escenario: El proveedor conectado conserva el marcador al abrir el selector
- GIVEN el perfil tiene un proveedor conectado seleccionado
- WHEN el usuario abre el selector de proveedor
- THEN la opción seleccionada muestra el marcador verde `bg-success`
- AND el estado de conexión sigue siendo visible
