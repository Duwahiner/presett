# opencode-2x-cli-compat

Rama: `feat/profile-and-model-management` (commit base `1e528c6`)
Copia en Engram: `odd/opencode-2x-cli-compat/tasks` (proyecto `presett`)

## Objetivo

Hacer que la detección de autenticación de proveedores y la carga del catálogo de
modelos de PreSett funcionen con opencode 2.4.2, cuyo CLI cambió de forma incompatible.

## Problema (verificado en esta máquina, 2026-11-27)

- `opencode providers list` no existe en opencode 2.x. Sale con código 1 e imprime la
  ayuda general. El comando de credenciales es `opencode auth list`.
- `opencode auth list` imprime filas como `Anthropic  OAuth  stored` (con CRLF). El
  analizador actual solo acepta líneas que empiezan con viñeta (`●` o `•`).
- `opencode models --verbose` sale con código 1 y el error
  `Unrecognized flag: --verbose`. `opencode models` a secas imprime un id
  `proveedor/modelo` por línea.

## Alcance

Dentro: `providerAuthService` y `modelCatalogService`, con sus tests.

Fuera (pospuesto, requiere una decisión de diseño):
- `gentle-ai sync --profile` / `--profile-phase` (los flags no existen en gentle-ai
  5.1.0 ni en 4.0.0).
- Estadísticas de uso con `opencode db` (se resuelve en `usage-stats-opencode-2x`).
- Mostrar el stderr real en los errores de las rutas de perfiles.

## Restricciones

- TDD estricto: observar RED antes de implementar y luego GREEN.
- Mantener legible el formato antiguo con viñetas (compatibilidad hacia atrás).
- Documentación y commits en español; el código y sus comentarios, en inglés.
- Unas 400 líneas de cambio por tarea es solo una heurística de planificación.

## Tareas

- [x] T1 Autenticación de proveedores: usar `opencode auth list` e interpretar el
      formato de filas de 2.x (manteniendo el de viñetas). Tests con salida real capturada.
- [x] T2 Catálogo de modelos: dejar de depender de `--verbose`. Probar primero con
      verbose y, si falla, usar `opencode models` (solo ids). Tests de ambos caminos.

## Criterios de aceptación

- `providerAuthService` devuelve los proveedores conectados a partir de la salida real
  de 2.x `Anthropic  OAuth  stored` (y las otras tres filas).
- Un `opencode models --verbose` fallido ya no vacía el catálogo en vivo: se usan los
  ids de `opencode models`.
- `npx vitest run` se mantiene en verde (línea base: 96 archivos, 843 tests).

## Declaración de ruta

T1 y T2: delegado directo, un solo escritor. Disparador: 2 o más archivos no triviales
con tests. El agente principal verificó el diff, volvió a ejecutar los tests de los dos
servicios y analizó la salida real del CLI.

## Progreso

- T1 hecho en el commit `331cf16` (providerAuthService y tests).
- T2 hecho en el commit `e7f67d6` (modelCatalogService y tests).

## Evidencia de verificación

- Línea base antes de los cambios: `npx vitest run` = 96 archivos, 843 tests en verde.
- RED (escritor): 7 fallos y 35 aciertos en los dos archivos de tests.
- GREEN (escritor): 2 archivos, 42 tests en verde. Suite completa: 96 archivos, 853 tests.
- `npx tsc --noEmit -p .`: sin errores.
- Verificación del agente principal: se repitieron los dos archivos de tests, 42 en verde.
- Prueba con el CLI real (test temporal de vitest, eliminado después):
  `parseConnectedProviders` sobre la salida real de `opencode auth list` devolvió
  Anthropic, Google y OpenAI como oauth y OpenCode como api.
  `parsePlainOpencodeModelsOutput` sobre la salida real de `opencode models` devolvió
  5 proveedores.
- No se ejecutó: lint, build ni la aplicación real en el navegador.

## Evaluación de revisión

- Nivel evaluado: alto (motivo: `process_boundary`, 350 líneas de cambio, 5 archivos).
- Resultado: consentimiento concedido, revisión nativa de 4 lentes APROBADA y con acuse
  (autoridad consumida). El archivo sin seguimiento `bash.exe.stackdump` se excluyó del
  candidato.
- La revisión se hizo sobre los commits originales. Después se reescribió el historial
  de la rama para que los mensajes y los documentos queden en español, sin cambiar el
  código.
- Hallazgos informativos, no bloqueantes (seguimiento, no motivo para revisar de nuevo):
  - `modelCatalogService.ts:142-149` (R2-001, R3-001, R4-001, R4-002): el `catch` sin
    filtrar recurre al respaldo ante cualquier fallo de verbose, incluido un tiempo de
    espera agotado, por lo que un CLI colgado puede tardar unos 60 s (dos esperas de
    30 s) antes de devolver FILE_MISSING.
  - `modelCatalogService.test.ts:126-148` (R3-002): advertencia de confiabilidad sobre
    el test del respaldo.
  - `providerAuthService.ts:137-158` (R2-002, R3-003, R4-003): sugerencias sobre
    `parseTabularRow`.

## Siguiente paso

Seguimiento opcional: limitar el respaldo de verbose al caso del flag rechazado.
Trabajo pospuesto: flags de perfiles de gentle-ai, y mostrar el stderr real en los
errores de las rutas de perfiles.
