# Perfiles OpenCode en PreSett

Guía de referencia de la gestión nativa de perfiles de OpenCode / Gentle-AI en
PreSett: estrategias detectadas, límites de escritura, delegación al CLI,
backups, reparación y rollback.

---

## 1. Modos de estrategia de perfil

PreSett clasifica el estado de los perfiles leyendo la configuración local
(`~/.config/opencode/opencode.json` o `opencode.jsonc`) en memoria, sin I/O
adicional ni caché. La clasificación se vuelve a calcular en cada petición
(`src/services/profileStrategyService.ts`).

| Estrategia | Señal detectada | Escrituras de PreSett |
|---|---|---|
| `generated-multi` | Existe el agente base `gentle-orchestrator` **o** al menos un perfil generado `sdd-orchestrator-{name}` | **Delegadas al CLI de Gentle-AI** |
| `external-single-active` | Existe un agente en modo `primary` que no es el orquestador base ni un perfil generado | **Ninguna — solo lectura** |
| `unknown` | No hay señal fiable (ni base, ni perfil generado, ni primary externo) | **Ninguna — solo lectura** |

### 1.1 generated-multi (contrato nativo de Gentle-AI)

Un perfil generado materializa un agente orquestador `sdd-orchestrator-{name}`
y diez agentes de fase `sdd-{fase}-{name}` (`init`, `propose`, `spec`,
`design`, `tasks`, `apply`, `verify`, `archive`, `explore`, `onboard`).

Todos los agentes `sdd-*` son propiedad exclusiva de Gentle-AI. PreSett **nunca
los escribe directamente**; cualquier mutación se delega al CLI.

### 1.2 external-single-active (solo lectura)

Los perfiles están gestionados por una herramienta externa. PreSett es
estrictamente de solo lectura: se permite leer (listar y consultar detalle),
pero toda mutación —crear, actualizar, asignar fase, eliminar, reparar y
cambiar— se bloquea con `403 STRATEGY_READONLY`.

### 1.3 unknown (solo lectura por seguridad)

Sin señal fiable, PreSett no puede garantizar el contrato de escritura. Por
seguridad, toda mutación también se bloquea con `403 STRATEGY_READONLY`. La
lectura sigue permitida.

---

## 2. Límites de escritura de PreSett

El patrón de guardrail se aplica a nivel de ruta de API (no en el adaptador),
consistente con el patrón existente `requireMutationOrigin`. Antes de cualquier
mutación, la ruta detecta la estrategia y llama a `guardProfileMutation`:

- `external-single-active` → `403 STRATEGY_READONLY`
- `unknown` → `403 STRATEGY_READONLY`
- `generated-multi` → `ok`, se continúa

| Operación | Ruta | Estrategia `generated-multi` | `external-single-active` / `unknown` |
|---|---|---|---|
| Crear perfil | `POST /api/profiles` | Delega al CLI | `403 STRATEGY_READONLY` |
| Editar orquestador | `PUT /api/profiles/{name}` | Delega al CLI | `403 STRATEGY_READONLY` |
| Asignar fase | `PUT /api/profiles/{name}/phases/{phase}` | Delega al CLI | `403 STRATEGY_READONLY` |
| Reparar | `POST /api/profiles/{name}/repair` | Backup + delega al CLI | `403 STRATEGY_READONLY` |
| Eliminar | `DELETE /api/profiles/{name}` | Escritura directa con backup | `403 STRATEGY_READONLY` |
| Cambiar activo | `POST /api/profiles/{name}/switch` | Escritura directa con backup | — |
| Guardar base | `PUT /api/profiles/base` | Escritura directa con backup | — |

> **Lecturas** (`GET /api/profiles`, `GET /api/profiles/{name}`,
> `GET /api/profiles/base`) siempre están permitidas, incluso en modos de solo
> lectura. El guardrail solo bloquea mutaciones.

---

## 3. Delegación al CLI de Gentle-AI

En `generated-multi`, PreSett delega la creación, edición y asignación de fase
al comando `gentle-ai sync` mediante `spawn()` con argumentos en array (sin
interpolación de shell, lo que elimina la inyección de shell clásica). La
inyección de argumentos se previene validando el nombre de perfil
(`/^[a-z0-9_-]+$/`) y el modelo contra el catálogo antes de cualquier `spawn`.

```sh
# Crear / actualizar el orquestador de un perfil
gentle-ai sync --profile {name}:{provider}/{model}

# Asignar un agente de fase
gentle-ai sync --profile-phase {name}:{phase}:{provider}/{model}

# Reparar un perfil incompleto (usa el modelo actual del orquestador)
gentle-ai sync --profile {name}:{provider}/{model}
```

Los resultados del CLI se exponen tal cual: `exitCode`, `stdout` y `stderr`. Un
`exitCode !== 0` se traduce a `500` en la respuesta de la API. PreSett **no
asume** que un sync es un no-op: no elimina ni reescribe agentes por cuenta
propia; el CLI es la autoridad sobre los agentes `sdd-*`.

El ejecutor de procesos (`src/services/processService.ts`) mantiene un único
punto de `spawn` con timeout y kill unificados. El timeout por defecto es de
120 s; la operación de reparación usa su propio timeout conservador (ver
sección 5).

---

## 4. Backups y rollback

### 4.1 Backup atómico antes de toda escritura directa

Toda escritura directa de `opencode.json` por parte de PreSett (eliminar
perfil, cambiar perfil activo, guardar base, migrar perfiles) va precedida de
un backup. Además, la reparación crea un backup atómico antes de delegar al
CLI.

El módulo `src/utils/backup.ts` proporciona el `BackupUtility`:

- `createAtomicBackup(sourceFile, backupDir)` copia el archivo a una ruta
  temporal y lo renombra en su posición final. El renombrado es atómico, por lo
  que un lector concurrente nunca observa un backup a medias.
- `backupFileName(sourceName)` genera un nombre con marca de tiempo local
  `YYYYMMDD-HHMMSS__{sourceName}` (ordenable cronológicamente).

Los backups de PreSett se guardan en `~/.presett/backups/` (configurable vía
`PRESETT_TEST_BACKUP_DIR` en pruebas) con el formato
`{YYYYMMDD-HHMMSS}__opencode.json` o `__opencode.jsonc`, según el archivo de
configuración real que se respalde.

> Los backups gestionados por Gentle-AI (su propio flujo de sincronización) se
> guardan en `~/.gentle-ai/backups/` y se gestionan desde la vista Backups de
> PreSett. Son un mecanismo distinto del `BackupUtility` de PreSett.

### 4.2 Rollback

Si una operación directa falla, el archivo de configuración no se toca (la
escritura es atómica: se escribe un temporal y se renombra solo al final). El
backup anterior queda intacto y recuperable.

En la reparación, como la escritura la ejecuta el CLI (autoridad sobre los
agentes `sdd-*`):

- **Éxito**: `opencode.json` queda como lo deje Gentle-AI; el backup previo se
  conserva para referencia.
- **Fallo** (`exitCode !== 0`): PreSett no reescribe nada; `opencode.json`
  queda sin cambios de PreSett y el backup es recuperable manualmente para
  volver al estado anterior.

---

## 5. Reparación de perfiles incompletos

### 5.1 Qué es un perfil incompleto

Tras cambios locales (por ejemplo, una migración que limpió agentes de fase), un
perfil `sdd-orchestrator-{name}` puede quedar **sin sus diez agentes de fase**.
`detectIncompleteProfiles` lo marca como `incomplete`. En la API y en la UI, el
perfil muestra una insignia `Incomplete` y un botón `Reparar`.

### 5.2 Flujo de la reparación

`POST /api/profiles/{name}/repair` (`src/app/api/profiles/[name]/repair/route.ts`):

1. Valida el origen de la petición (`requireMutationOrigin`).
2. Valida el nombre de perfil (`/^[a-z0-9_-]+$/`); si es inválido → `400`.
3. Detecta la estrategia y aplica el guardrail; en `external-single-active` o
   `unknown` → `403 STRATEGY_READONLY`.
4. Crea un **backup atómico** de `opencode.json` (o `.jsonc`) en
   `~/.presett/backups/`.
5. Delega al CLI: `gentle-ai sync --profile {name}:{provider}/{model}`, usando
   el modelo actual del orquestador.
6. `exitCode === 0` → `200 { ok: true, backup }`.
   `exitCode !== 0` → `500 { error.code: "REPAIR_FAILED", backup }`.

La reparación **nunca** escribe `opencode.json` por parte de PreSett: delega
exclusivamente al sync de Gentle-AI y conserva el backup como ruta de rollback.

### 5.3 Timeout de la reparación

La reparación usa un **timeout conservador de 30 s** por defecto
(`DEFAULT_REPAIR_TIMEOUT_MS = 30_000`). Si el sync excede ese límite, el
proceso se termina y se devuelve un error de timeout.

El timeout es configurable a través de la variable de entorno
`PRESETT_TEST_REPAIR_TIMEOUT_MS` (valor en milisegundos; debe ser un entero
positivo). Esto permite ajustar el presupuesto en entornos de prueba o cuando
la infraestructura requiere un límite distinto:

```sh
PRESETT_TEST_REPAIR_TIMEOUT_MS=45000
```

> El valor `PRESETT_TEST_*` se usa también en las pruebas para apuntar a
> directorios temporales (`PRESETT_TEST_CONFIG_DIR`, `PRESETT_TEST_BACKUP_DIR`)
> y a un comando de sync simulado (`PRESETT_TEST_SYNC_COMMAND`), de modo que las
> pruebas nunca ejecutan un sync real sobre la configuración del usuario.

### 5.4 Confirmación explícita

La reparación es una mutación manual y potencialmente costosa (re-materializa
hasta diez agentes de fase). Por eso exige **confirmación explícita del
usuario**: en la UI, pulsar `Reparar` abre un diálogo de confirmación
(`ConfirmDialog`) que describe la operación y su respaldo, y la reparación solo
se dispara al confirmar. La confirmación es a nivel de interfaz; el endpoint no
ejecuta la reparación de forma automática ni en segundo plano.

---

## 6. Referencia de rutas

| Método y ruta | Acción |
|---|---|
| `GET /api/profiles` | Lista perfiles, expone `strategy` e `incomplete` |
| `POST /api/profiles` | Crea un perfil (delega al CLI) |
| `GET /api/profiles/{name}` | Detalle de un perfil (solo el orquestador) |
| `PUT /api/profiles/{name}` | Edita el orquestador (delega al CLI) |
| `DELETE /api/profiles/{name}` | Elimina un perfil (escritura directa con backup) |
| `PUT /api/profiles/{name}/phases/{phase}` | Asigna un agente de fase (delega al CLI) |
| `POST /api/profiles/{name}/repair` | Repara un perfil incompleto (backup + delega al CLI) |
| `POST /api/profiles/{name}/switch` | Cambia el perfil activo (escritura directa con backup) |
| `GET/PUT /api/profiles/base` | Consulta/edita el perfil Base (vacío) |
| `POST /api/profiles/base/switch` | Activa el perfil Base |

El nombre `base` es un nombre de perfil reservado: identifica al perfil Base
integrado (identidad de nombre vacío `name: ""`) y **no** puede usarse para
crear un perfil con nombre; `createProfile` lo rechaza con `SCHEMA_INVALID`.
Como la ruta estática `base` se resuelve antes que la ruta dinámica `[name]`,
el camino reservado nunca colapsa hacia el listado ni a un manejador de perfil
con nombre. Los perfiles con nombre siguen siendo direccionables mediante
`/api/profiles/{name}`.

---

## 7. Archivos y módulos implicados

| Módulo | Responsabilidad |
|---|---|
| `src/services/profileStrategyService.ts` | Detección de estrategia, detección de incompletos, guardrail de mutación |
| `src/services/processService.ts` | Ejecución de `gentle-ai sync` con args y timeout |
| `src/adapters/opencode.ts` | Lectura/escritura de `opencode.json`, `createProfile`/`updateProfile`/`updateProfilePhase`/`repairProfile` (delegación) |
| `src/utils/backup.ts` | `BackupUtility`: backup atómico con renombrado |
| `src/app/api/profiles/...` | Rutas de la API de perfiles |
| `src/components/organisms/ProfilesClient/...` | UI de perfiles: insignia `Incomplete`, botón `Reparar`, banner de solo lectura |

---

## 8. Notas de verificación

- La estrategia se detecta en cada petición (O(1) sobre la config en memoria),
  sin caché ni estado compartido entre peticiones.
- PreSett no instala Gentle-AI, agentes ni componentes.
- PreSett no modifica `state.json` (toggles, persona, modo SDD).
- Los agentes `sdd-*` son de solo lectura para PreSett en todos los casos;
  cualquier cambio se delega al CLI de Gentle-AI.