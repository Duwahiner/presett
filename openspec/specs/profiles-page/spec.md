# Especificación de profiles-page

## Requisitos

### Requisito: Profiles page adopta el reskin v2
El sistema MUST rediseñar `/profiles` con los tokens v2 y el diseño brutalista mientras preserva el comportamiento de gestión de perfiles existente.

#### Escenario: La lista de perfiles se renderiza con el estilo v2
- GIVEN el usuario abre `/profiles`
- WHEN la página carga
- THEN la página usa el contrato de borde, radio y sombra v2
- AND los datos del perfil actual permanecen accesibles

### Requisito: El modal de creación de perfil coincide con el contrato del PDF
El sistema MUST renderizar un modal de Crear Perfil con un campo `Profile name` único, validación en línea `Name is required.` y botones `CANCEL` más `SAVE PROFILE`.

#### Escenario: El nombre vacío se rechaza en línea
- GIVEN el modal está abierto
- WHEN el usuario envía con un nombre vacío
- THEN el error en línea `Name is required.` aparece en magenta

#### Escenario: Las acciones del modal coinciden con la referencia
- GIVEN el modal está abierto
- WHEN el usuario visualiza las acciones del pie de página
- THEN `CANCEL` y `SAVE PROFILE` se muestran

### Requisito: Edición hidratada con bloqueo de guardado

El sistema MUST solicitar el detalle completo antes de entrar en edición, poblar `editAssignments` solo tras respuesta exitosa y bloquear el guardado mientras el detalle carga o falla. Para Base, la identidad explícita MUST resolverse sin perder su asignación `gentle-orchestrator`.

#### Escenario: La edición se hidrata con detalle real
- GIVEN el usuario inicia edición de un perfil existente
- WHEN el detalle responde correctamente
- THEN el formulario muestra las asignaciones persistidas
- AND no se inicia con `{}`

#### Escenario: Base hidrata su asignación persistida
- GIVEN el usuario inicia edición del perfil Base
- WHEN el detalle de Base responde correctamente
- THEN `editAssignments` incluye `gentle-orchestrator`
- AND no se sobrescriben perfiles con nombre

#### Escenario: Carga o error bloquean guardar
- GIVEN el detalle está cargando o falló
- WHEN el usuario intenta guardar
- THEN el sistema impide la mutación
- AND conserva el estado de error o carga visible

### Requisito: Se conservan asignaciones fuera de catálogo
El sistema MUST mostrar y preservar asignaciones cuyo proveedor, modelo o variante no existan en el catálogo activo, y MUST mantener visible el estado de conexión cuando el proveedor seleccionado siga en `connectedSet`, con el selector abierto y cerrado.

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


### Requisito: Los perfiles con nombre se preservan al hidratar Base

The system MUST keep named profiles and their assignments unchanged while hydrating Base detail.

#### Escenario: Base no muta perfiles nombrados
- GIVEN existen perfiles con nombre y asignaciones persistidas
- WHEN se abre edición de Base
- THEN los perfiles nombrados permanecen intactos
- AND sus asignaciones no cambian

### Requisito: PUT completo y cancelación sin mutación
El sistema MUST enviar un `PUT` completo con el estado hidratado más los cambios del usuario, y cancelar MUST descartar el estado local sin llamar a la API.

#### Escenario: Guardado incluye asignaciones no tocadas
- GIVEN el perfil fue hidratado y el usuario no cambia una asignación existente
- WHEN guarda la edición
- THEN el `PUT` incluye esa asignación sin perderla

#### Escenario: Cancelar descarta cambios locales
- GIVEN el usuario modificó la edición local
- WHEN cancela
- THEN no se llama a `PUT`
- AND el estado editado se limpia

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

### Requisito: Las listas de selectores se ordenan de forma determinista
El sistema MUST ordenar localmente las listas visibles de perfiles, proveedores, modelos y variantes antes de renderizarlas.

#### Escenario: El orden no depende del catálogo
- GIVEN el catálogo llega en orden arbitrario
- WHEN la vista de perfiles o creación se renderiza
- THEN las listas se muestran en orden determinista
- AND el orden visible no cambia entre cargas equivalentes

### Requisito: La variante es opcional cuando el modelo no tiene variantes
El sistema MUST permitir guardar y editar un perfil sin `variant` cuando el modelo seleccionado no tenga variantes.

#### Escenario: Un modelo sin variantes guarda sin `variant`
- GIVEN el modelo seleccionado no tiene variantes
- WHEN el usuario crea o edita el perfil
- THEN el selector de variantes no bloquea el guardado
- AND la variante puede omitirse del formulario

#### Escenario: Una variante desconocida se rechaza
- GIVEN el usuario selecciona una variante que no pertenece al modelo
- WHEN valida el formulario
- THEN el sistema rechaza la asignación
- AND no permite persistir un valor inválido

### Requisito: La creación de perfil normaliza el nombre antes de enviar
El sistema MUST normalizar el nombre del perfil en el boundary de UI antes del POST y validar el valor final contra el contrato.

#### Escenario: Un nombre con mayúsculas se normaliza
- GIVEN el usuario ingresa un nombre con mayúsculas o caracteres inválidos
- WHEN envía la creación
- THEN el nombre se transforma a una forma válida antes del POST
- AND no se envía un valor no sanitizado
