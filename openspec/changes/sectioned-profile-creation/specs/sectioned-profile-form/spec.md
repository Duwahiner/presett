# Especificación de sectioned-profile-form

## Propósito

La creación de perfiles debe exponer todas las fases SDD en secciones visibles, con edición individual por fase y una acción para copiar la asignación del orquestador dentro de cada sección.

## Requisitos

### Requisito: La creación se organiza por secciones de flujo
El sistema MUST mostrar la creación de perfiles en cuatro secciones: Orchestrator, Planning, Design & Execution y Closure & Support, con las fases correspondientes agrupadas bajo cada una.

#### Escenario: La interfaz presenta todas las secciones
- GIVEN el usuario abre el formulario de creación
- WHEN la vista se renderiza
- THEN las cuatro secciones se muestran con sus fases asignadas
- AND cada fase mantiene su selector propio

### Requisito: Cada fase se edita de forma individual
El sistema MUST permitir configurar provider, model y variant por cada fase sin forzar valores compartidos entre fases.

#### Escenario: Una fase cambia sin afectar a las demás
- GIVEN dos fases tienen asignaciones distintas
- WHEN el usuario edita solo una fase
- THEN la otra fase conserva su valor anterior

### Requisito: La asignación del orquestador se puede copiar por sección
El sistema MUST ofrecer una acción por sección que copie la asignación actual del orquestador a todas las fases de esa sección.

#### Escenario: Copiar a una sección rellena sus fases
- GIVEN el orquestador ya tiene provider y model seleccionados
- WHEN el usuario usa la acción de copiar en una sección
- THEN todas las fases de esa sección reciben la asignación del orquestador
- AND las demás secciones no cambian

### Requisito: Solo se persisten las fases asignadas
El sistema MUST persistir únicamente las fases que tengan provider configurado, y MUST omitir las fases vacías al crear el perfil.

#### Escenario: Las fases vacías no se guardan
- GIVEN el usuario deja algunas fases sin asignación
- WHEN guarda el perfil
- THEN solo se persisten las fases con provider definido
- AND las fases vacías no generan entradas

### Requisito: La variante es opcional
El sistema MUST mostrar variant solo cuando el modelo seleccionado tenga variantes disponibles, y MUST permitir guardar sin variant cuando no existan.

#### Escenario: Un modelo sin variantes oculta el campo
- GIVEN el modelo seleccionado no tiene variantes
- WHEN el selector de modelo cambia
- THEN el campo variant no se muestra
- AND la creación sigue siendo válida
