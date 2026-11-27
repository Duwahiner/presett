# Delta para profiles-page

## REQUISITOS ADICIONADOS

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
