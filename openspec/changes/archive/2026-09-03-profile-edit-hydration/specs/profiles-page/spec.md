# Delta para profiles-page

## REQUISITOS ADICIONADOS

### Requisito: Edición hidratada con bloqueo de guardado

El sistema MUST solicitar el detalle completo antes de entrar en edición, poblar `editAssignments` solo tras respuesta exitosa y bloquear el guardado mientras el detalle carga o falla.

#### Escenario: La edición se hidrata con detalle real
- GIVEN el usuario inicia edición de un perfil existente
- WHEN el detalle responde correctamente
- THEN el formulario muestra las asignaciones persistidas
- AND no se inicia con `{}`

#### Escenario: Carga o error bloquean guardar
- GIVEN el detalle está cargando o falló
- WHEN el usuario intenta guardar
- THEN el sistema impide la mutación
- AND conserva el estado de error o carga visible

### Requisito: Se conservan asignaciones fuera de catálogo

El sistema MUST mostrar y preservar asignaciones cuyo proveedor, modelo o variante no existan en el catálogo activo.

#### Escenario: Asignación fuera de catálogo sigue editable
- GIVEN una asignación persistida no está en el catálogo activo
- WHEN el usuario abre edición
- THEN la asignación sigue visible y editable
- AND se conserva al guardar

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

### Requisito: Audit mode no hace lecturas ni escrituras mutativas

El sistema MUST usar fixtures en audit mode y no realizar `GET` real ni permitir save/cancel mutativos.

#### Escenario: Audit mode evita mutaciones
- GIVEN la pantalla está en audit mode
- WHEN el usuario entra a perfiles
- THEN se usan fixtures
- AND no se ejecutan llamadas mutativas ni al detalle real
