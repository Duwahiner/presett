# usage-stats-opencode-2x

Rama: `feat/profile-and-model-management` (commit base `e7f67d6`)
Copia en Engram: `odd/usage-stats-opencode-2x/tasks` (proyecto `presett`)

## Objetivo

Hacer que la página Usage & Cost funcione con opencode 2.4.2, donde `opencode db` ya
no existe.

## Problema (verificado en esta máquina, 2026-11-27)

- `usageStatsService` ejecutaba `opencode db "<sql>" --format json` sobre las tablas
  `message` y `session`. opencode 2.x no tiene el subcomando `db`.
- Leer `~/.local/share/opencode/opencode.db` directamente NO es una solución válida:
  las tablas heredadas `message` y `session` dejaron de actualizarse el
  2026-11-27T06:22Z, mientras que las sesiones nuevas viven en otras tablas
  (`session_v2`, `session_message`). Una SQL reparada subestimaría el uso sin avisar.
- Reemplazos disponibles en el CLI 2.x:
  - `opencode stats [--days N | --all] [--project <id>] --models --cost --json`
    devuelve, por modelo: `model.id`, `model.providerID`, `model.variant`, `steps`,
    `tokens.{input,output,reasoning,cache}` y `cost`. Responde en unos 2 s. Ojo:
    `--days 0` significa "hoy", así que days=0 de la app ("todo") debe usar `--all`.
  - `opencode session list --format json -n N` devuelve solo `id`, `title`, `updated`,
    `created`, `projectId` y `directory`. Lista únicamente las sesiones del proyecto que
    contiene el directorio de trabajo del proceso.

## Diseño aceptado (decisión del usuario)

- El uso por proveedor y modelo sale de `opencode stats --json`.
- Las sesiones recientes salen de `opencode session list --format json`. El costo, los
  tokens y la cantidad de mensajes por sesión NO están disponibles, así que pasan a ser
  "no disponible" (null) en lugar de números.
- Limitación conocida: las sesiones recientes se limitan al proyecto del directorio de
  trabajo del proceso.

## Alcance

Dentro: `usageStatsService`, `usageStatsApiService`, la ruta de la API de usageStats,
los componentes de usageStatsClient y los tests y textos i18n necesarios.

Fuera: los flags de perfiles de `gentle-ai sync`, la gestión de perfiles.

## Restricciones

- TDD estricto: observar RED antes de implementar y luego GREEN.
- No usar shell con argumentos construidos a partir de entrada del usuario (mantener
  `execFile` con `shell:false`).
- Documentación y commits en español; el código y sus comentarios, en inglés.
- Unas 400 líneas de cambio por tarea es solo una heurística de planificación.

## Tareas

- [x] T1 Servicio: reemplazar la recolección basada en SQL por `opencode stats --json`
      (proveedores y modelos) y `opencode session list --format json` (sesiones recientes).
- [x] T2 Interfaz y tipos: volver anulables el costo, los tokens y la cantidad de
      mensajes por sesión, y mostrar "No disponible", con textos i18n en en y es.
- [x] T3 Ejecutable configurable: permitir `OPENCODE_BIN` para indicar el ejecutable de
      opencode (ver "Bloqueo de entorno").

## Criterios de aceptación

- Los datos de la página se cargan desde el CLI real de opencode 2.4.2 sin `opencode db`.
- Ningún camino de código ejecuta `opencode db` ni lee `opencode.db` directamente.
- El costo, los tokens y la cantidad de mensajes por sesión se muestran como
  "No disponible", nunca como 0.
- `npx vitest run` y `npx tsc --noEmit -p .` se mantienen en verde.

## Declaración de ruta

T1 y T2: delegado directo, un solo escritor (2 o más archivos no triviales con tests).
T3: directo en línea (cambio pequeño y ya entendido, con TDD del agente principal).

## Progreso

- T1 y T2 hechos juntos en un mismo bloque de trabajo, porque los campos anulables de
  `RecentSession` abarcan el servicio y la vista. Commit `55e1c02`.
- T3 hecho en el commit `d3bde12`.

## Evidencia de verificación

- Línea base: `npx vitest run` = 96 archivos, 853 tests en verde.
- RED (escritor): 26 fallos y 228 aciertos en los tests de servicios, ruta y vista.
- GREEN (escritor): 23 archivos, 254 tests en verde. Suite completa: 96 archivos, 854 tests.
- Verificación del agente principal: tests del servicio y de la vista repetidos, 57 en
  verde. No queda uso de `opencode db`, `opencode.db`, `escapeSqlLiteral` ni
  `buildDbArgs` en `src`.
- Prueba con el CLI real (escritor, tests temporales eliminados): el analizador procesó
  la salida real de `opencode stats --days 7 --models --cost --json` y de
  `opencode session list --format json`.
- T3: RED observado (falló el test que esperaba la ruta de `OPENCODE_BIN`), luego GREEN.
  Suite completa: 96 archivos, 856 tests en verde y `tsc` sin errores. Con el servicio
  real: sin `OPENCODE_BIN` falla con ENOENT; con `OPENCODE_BIN` apuntando a la 2.4.2
  devuelve datos (3 proveedores).
- No se ejecutó: lint, build ni la página en el navegador.

## Bloqueo de entorno

`execFile("opencode")` de Node con `shell:false` solo resuelve archivos `.exe` del PATH.
En esta máquina era `~/.opencode/bin/opencode.exe` (v1.18.34), que no tiene
`stats --json`, en lugar de la 2.4.2 detrás del atajo `opencode.cmd` de npm. Se movió ese
`.exe` viejo al respaldo, con lo que `gentle-ai doctor` quedó en "healthy". Al no quedar
ningún `.exe` en el PATH, Node ya no encuentra `opencode`, por lo que se agregó
`OPENCODE_BIN` (T3) y un `.env.local` local con la ruta del binario 2.4.2.

## Evaluación de revisión

- Evaluado con `gentle-ai review assess --base-ref e7f67d6 --committed-only` (archivo sin
  seguimiento `bash.exe.stackdump` excluido): riesgo medio (cambio ejecutable en el test
  de la ruta de usageStats), `review_due: false`, motivo `under_budget`.
- Resultado: no se requiere revisión para este bloque. Según la regla ODD queda
  pendiente dentro del bloque hasta que un commit posterior alcance el presupuesto de
  entrega.
- Después se reescribió el historial de la rama para que los mensajes y los documentos
  queden en español, sin cambiar el código.

## Siguiente paso

Pospuesto: gestión de perfiles (los flags `gentle-ai sync --profile` ya no existen y
requieren una decisión de diseño).
