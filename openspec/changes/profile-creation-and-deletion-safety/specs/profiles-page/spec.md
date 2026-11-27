# Delta para profiles-page

## MODIFIED Requirements

### Requisito: La variante es opcional cuando el modelo no tiene variantes
El sistema MUST mostrar siempre el selector de variante; cuando no existan variantes, el control MUST permanecer visible pero deshabilitado.
(Previously: el selector podía desaparecer y bloquear la grilla cuando `variants.length === 0`.)

#### Escenario: Un modelo sin variantes conserva la fila visible
- GIVEN el modelo seleccionado no tiene variantes
- WHEN la vista se renderiza
- THEN el selector de variante sigue visible
- AND permanece deshabilitado

#### Escenario: Un modelo con variantes sigue habilitado
- GIVEN el modelo seleccionado tiene variantes
- WHEN la vista se renderiza
- THEN el selector de variante está visible
- AND permite elegir una variante válida

## ADDED Requirements

### Requisito: El orquestador se muestra como sección plana
El sistema MUST renderizar el orquestador fuera de un acordeón, siempre visible en la pantalla de creación.

#### Escenario: El orquestador no depende de expansión
- GIVEN el usuario abre la pantalla de creación
- WHEN la UI carga
- THEN el orquestador aparece como bloque plano
- AND no requiere expandir un acordeón

### Requisito: Base no expone acción de borrado en la UI
El sistema MUST ocultar o deshabilitar la acción Delete para el perfil Base.

#### Escenario: Base no ofrece borrado
- GIVEN la tarjeta corresponde al perfil Base
- WHEN se renderizan las acciones
- THEN Delete no se muestra o queda deshabilitado
- AND la UI no permite iniciar el borrado
