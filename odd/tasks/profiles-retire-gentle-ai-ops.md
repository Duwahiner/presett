# profiles-retire-gentle-ai-ops

Rama: `feat/profile-and-model-management` (commit base `ff387bb`)
Copia en Engram: `odd/profiles-retire-gentle-ai-ops/tasks` (proyecto `presett`)

## Objetivo

Retirar de PreSett, y solo de PreSett, las cuatro operaciones de perfiles que dependen de
los flags `gentle-ai sync --profile` y `--profile-phase`, que gentle-ai retiró a propósito.

## Restricción dura (decisión del usuario)

Ningún cambio puede afectar a opencode ni a gentle-ai. Por eso no se escriben agentes
`sdd-*` ni configuración nueva en ningún lado: las funciones se desactivan dentro de
PreSett. Las pruebas usan mocks y no se ejecuta la aplicación real contra gentle-ai.

## Problema (verificado)

- gentle-ai 5.1.0 rechaza `--profile`, `--profile-phase`, `--sdd-mode` y
  `--sdd-profile-strategy` (test `TestSyncFlagsRetiredOptionsRejectedAndHelpOmitted` en su
  código, tag v5.1.0). Para elegir modelos remite a la pantalla Configure Models del TUI.
- Cuatro rutas de PreSett lanzan esos flags, por lo que siempre fallan con un 500
  genérico. Ninguna escribe `opencode.json`; solo `repair` escribe un respaldo, en la
  carpeta propia de PreSett:
  - `POST /api/profiles` (crear)
  - `PUT /api/profiles/[name]` (editar un perfil con nombre)
  - `PUT /api/profiles/[name]/phases/[phase]` (asignar fase; la interfaz no la llama)
  - `POST /api/profiles/[name]/repair` (reparar)

## Diseño

- Servidor: las cuatro rutas responden de inmediato **410** con
  `{ error: { code: "FEATURE_RETIRED", message } }`, justo después de validar el origen y
  antes de leer la configuración, cargar el catálogo o lanzar ningún proceso.
- Cliente: crear queda desactivado, reparar y la insignia de "incompleto" se reemplazan
  por un aviso, y guardar la edición de un perfil con nombre queda desactivado, todo con
  un mensaje claro (clave i18n nueva, en en y es).
- Guardar desde la pantalla de edición queda como una operación sin efecto. El diseño
  inicial suponía que el perfil Base se guardaba por ese camino; no es así: el manejador
  original salía con `if (!editingProfile) return;` y el Base tiene nombre vacío, por lo
  que nunca se guardaba desde esa pantalla. Habilitarlo activaría una escritura nueva en
  `opencode.json`, contra la restricción, y se descartó.
- Se mantienen sin cambios: cambiar perfil, borrar perfil, editar el modelo base y los
  listados y detalles. Estos escriben `opencode.json` directamente, como hasta ahora.
- Los adaptadores (`createProfile`, `updateProfile`, `updateProfilePhase`,
  `repairProfile`) no se modifican: quedan sin uso desde las rutas. Retirarlos del todo
  queda como trabajo posterior.

## Fuera de alcance

- `POST /api/sync` (ejecuta `gentle-ai sync` sin flags de perfiles): es una función
  distinta y su retiro es otra decisión.
- `gentle-ai --version` que se ejecuta al renderizar el layout: solo lectura.
- Rediseñar los perfiles sobre lo que gentle-ai 5.x sí soporta.

## Restricciones

- TDD estricto: observar RED antes de implementar y luego GREEN.
- Documentación y commits en español; el código y sus comentarios, en inglés; los textos
  de la interfaz en en y es.
- Unas 400 líneas de cambio por tarea es solo una heurística de planificación.

## Tareas

- [x] T1 Servidor: las cuatro rutas responden 410 FEATURE_RETIRED sin leer ni lanzar nada,
      con sus tests.
- [x] T2 Interfaz: desactivar crear, reemplazar reparar y guardar edición de perfiles con
      nombre por un aviso, con textos en en y es y sus tests.

## Criterios de aceptación

- Ninguna de las cuatro rutas llama a `runGentleAiSync`, lee `opencode.json` ni escribe
  respaldos (los tests lo comprueban con mocks).
- Cambiar perfil y borrar perfil siguen funcionando (sus tests existentes siguen en
  verde). No se habilita ninguna escritura nueva en `opencode.json`.
- La interfaz no ofrece acciones que siempre fallan y explica por qué.
- `npx vitest run` y `npx tsc --noEmit -p .` en verde (línea base: 96 archivos, 856 tests).

## Declaración de ruta

T1 y T2: delegado directo, un solo escritor (más de dos archivos no triviales con tests).

## Progreso

T1 y T2 hechos juntos en un mismo bloque de trabajo. Commit `89636d7`.

Corrección del agente principal sobre el trabajo del escritor: el escritor cambió la guarda
de `handleEditSave` de `if (!editingProfile) return;` a `if (editingProfile !== "") return;`,
lo que habilitaba guardar el perfil Base y, con ello, una escritura en `opencode.json` que
antes no ocurría. Se verificó contra `HEAD` (el original solo tenía tests de un perfil con
nombre) y se revirtió: el manejador quedó sin efecto, se reemplazaron los tests de guardado
del Base por uno que comprueba que no se llama a `updateProfile`, y se quitó de la tabla de
integración el escenario "update". El mapeo previo que decía que el Base se guardaba por ese
camino era incorrecto.

## Evidencia de verificación

- Línea base: `npx vitest run` = 96 archivos, 856 tests en verde (commit `ff387bb`).
- RED (escritor): 25 tests fallidos en 8 archivos sobre rutas, interfaz y hooks.
- GREEN final: 13 archivos y 160 tests en el subconjunto; suite completa 96 archivos y
  833 tests. La baja de 23 tests respecto de la línea base es por los tests de los caminos
  de éxito de crear, editar, fase y reparar, reemplazados por menos tests de 410 y de
  interfaz retirada.
- `npx tsc --noEmit -p .`: sin errores.
- `eslint` sobre los archivos cambiados: un solo problema, `react-hooks/set-state-in-effect`
  en el `useEffect` del modo auditoría de `profilesClient.tsx` (línea 132), que ya estaba
  en `HEAD` con el mismo código; no hay problemas nuevos.
- Las cuatro rutas no llaman a `runGentleAiSync`, no leen `opencode.json`, no cargan el
  catálogo ni escriben respaldos: lo verifican tests con mocks, que además comprueban que
  `opencode.json` queda idéntico. Nunca se ejecutó `gentle-ai` ni la aplicación real.
- No se ejecutó: build ni la interfaz en el navegador.

## Evaluación de revisión

- Evaluado con `gentle-ai review assess --base-ref e7f67d6 --committed-only` (archivo sin
  seguimiento `bash.exe.stackdump` excluido): riesgo medio (cambio ejecutable en el test de
  la ruta de `[name]`), `review_due: false`, motivo `under_budget`.
- Resultado: no se requiere revisión para este bloque; queda pendiente dentro del bloque
  acumulado hasta que un commit posterior alcance el presupuesto de entrega.

## Siguiente paso

Delegar T1 y T2 a un escritor, verificar y commitear por bloque de trabajo.
