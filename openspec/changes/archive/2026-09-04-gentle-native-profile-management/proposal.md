# Proposal: Gentle Native Profile Management

## Intent

PreSett actualmente escribe `opencode.json` directamente al crear/actualizar perfiles,
saltándose el contrato nativo de Gentle-AI. Además, la sesión local ya ejecutó
`single-orchestrator-profiles` que limpió los 10 subagentes de fase dejando sólo
`sdd-orchestrator-{name}` — estado que gentle-ai nunca completó porque `--profile` nunca fue
invocado. Esta propuesta cubre ambos modos aprobados: `generated-multi` (vía CLI Gentle-AI,
camino primario) y `external-single-active` (compatibilidad segura, sin escrituras externas).

**Objetivo**: PreSett detecta la estrategia activa, delega escrituras a `gentle-ai sync` en
`generated-multi`, queda en modo lectura en `external-single-active`, migra los perfiles
locales que quedaron limpios por el cambio anterior, y ofrece UI diferenciada por estrategia.

---

## Contrato de estrategias (fuente: `docs/opencode-profiles.md`)

### `generated-multi` — modo primario

| Concepto | Valor |
|---|---|
| Agente base | `gentle-orchestrator` (inmutable) |
| Perfil nombrado — orquestador | `sdd-orchestrator-{name}` · mode `primary` |
| Perfil nombrado — fases | `sdd-{phase}-{name}` × 10 · mode `subagent`, **hidden** |
| Prompts de fase | compartidos en `~/.config/opencode/prompts/sdd/sdd-{phase}.md`; sólo varía `model` |
| Crear perfil | `gentle-ai sync --profile {name}:{provider}/{model}` |
| Override por fase | `gentle-ai sync --profile-phase {name}:{phase}:{provider}/{model}` |
| Sincronización base | `gentle-ai sync` (sin flags) |
| Activación en OpenCode | Tab entre orquestadores |
| Escrituras PreSett | **Sólo `deleteProfile`** con backup atómico; todo lo demás vía CLI |

### `external-single-active` — modo compatibilidad

| Concepto | Valor |
|---|---|
| Gestión de perfiles | Herramienta externa (no PreSett, no gentle-ai) |
| Escrituras PreSett | **Ninguna** — PreSett es estrictamente read-only para perfiles |
| Activación en OpenCode | La herramienta externa controla qué perfil está activo |
| `listProfiles` | Lee `opencode.json` pero muestra banner de sólo lectura |
| `createProfile` | Bloqueado — UI muestra "Gestionado externamente" |
| `updateProfile` / `updateProfilePhase` | Bloqueados |
| `deleteProfile` | Bloqueado |

---

## Detección de estrategia

PreSett detecta la estrategia al arrancar y al recargar `listProfiles`:

```
detectProfileStrategy() → "generated-multi" | "external-single-active" | "unknown"
```

**Señales de `generated-multi`**:
- `gentle-orchestrator` existe en `opencode.json` **y** al menos un `sdd-orchestrator-{name}` presente, **o**
- ningún perfil nombrado existe aún pero `gentle-orchestrator` está presente y el CLI responde a `gentle-ai sync --dry-run` (o `--version`)

**Señales de `external-single-active`**:
- Existen perfiles en `opencode.json` con formato distinto al esquema `sdd-orchestrator-{name}` de Gentle-AI **o**
- `gentle-orchestrator` ausente y hay al menos un agente de tipo `primary` no gestionado por Gentle-AI

**Fallback `unknown`**: sin perfiles y sin CLI disponible → UI muestra advertencia y opciones de configuración manual.

La estrategia detectada se guarda en `~/.gentle-ai/state.json` bajo `profile_strategy` si el campo existe; en caso contrario se persiste únicamente en memoria de sesión y se re-detecta en cada carga.

---

## Scope

### In Scope

**Compartido (ambos modos)**
- `detectProfileStrategy()` en `profileService.ts` — señales, fallback, resultado cacheado en sesión
- `listProfiles` expone campo `strategy` en respuesta de API

**Modo `generated-multi`**
- `runGentleAiSync` acepta args opcionales `--profile` y `--profile-phase`
- `createProfile` → `gentle-ai sync --profile {name}:{provider}/{model}`; sin escritura directa
- `updateProfile` (orquestador) → `gentle-ai sync --profile {name}:{provider}/{model}`
- `updateProfilePhase` → `gentle-ai sync --profile-phase {name}:{phase}:{provider}/{model}`
- `deleteProfile` → escritura directa con backup atómico; elimina los 11 agents
- Migración post-`single-orchestrator-profiles`: perfiles con sólo `sdd-orchestrator-{name}` y sin sus 10 fases → completar vía `gentle-ai sync --profile {name}:{model}`
- Página Models: sección per-fase (10 fases editables) para perfiles `generated-multi`
- UI creación seccional: paso 1 = nombre + modelo orquestador; paso 2 = overrides de fase opcionales

**Modo `external-single-active`**
- `listProfiles` en modo lectura con banner "Gestionado externamente — sólo lectura"
- `createProfile`, `updateProfile`, `updateProfilePhase`, `deleteProfile` retornan `403 Strategy:ReadOnly` sin ejecutar ninguna operación
- UI deshabilita controles de creación/edición/eliminación; muestra tooltip explicativo

### Out of Scope

- Cambiar la estrategia activa desde PreSett (`--sdd-profile-strategy`) — sólo lectura/detección
- Reasoning effort / variants en picker de fases — segunda iteración
- Creación de perfiles desde CLI de PreSett
- Gestión de `Judgment Day` agents (`jd-judge-a`, `jd-judge-b`, `jd-fix-agent`) — slot independiente

---

## Capabilities

### New Capabilities
- `profile-strategy-detection`: detectar y exponer la estrategia activa (`generated-multi` / `external-single-active` / `unknown`)
- `gentle-ai-profile-delegation`: delegar create/update a `gentle-ai sync --profile` y `--profile-phase`
- `profile-phase-assignment-ui`: edición per-fase en Models para perfiles `generated-multi`

### Modified Capabilities
- `profile-management`: añade detección de estrategia; bloquea escrituras en `external-single-active`; delega a CLI en `generated-multi`

---

## Approach

### Detección (`profileService.ts`)

```ts
detectProfileStrategy(): ProfileStrategy
  → lee opencode.json (agentes presentes)
  → si señales generated-multi → "generated-multi"
  → si señales external → "external-single-active"
  → sino → "unknown"
```

### Límites de escritura por estrategia

| Operación | `generated-multi` | `external-single-active` |
|---|---|---|
| `createProfile` | CLI `--profile` | `403 Strategy:ReadOnly` |
| `updateProfile` | CLI `--profile` | `403 Strategy:ReadOnly` |
| `updateProfilePhase` | CLI `--profile-phase` | `403 Strategy:ReadOnly` |
| `deleteProfile` | Escritura directa + backup | `403 Strategy:ReadOnly` |
| `listProfiles` | Lectura + campo `strategy` | Lectura + campo `strategy` + banner |

### Capa de proceso (`processService.ts`)

```
runGentleAiSync(args?: string[])
  → spawn("gentle-ai", ["sync", ...args])
```

`args` ejemplos:
- `["--profile", "cheap:anthropic/claude-haiku-3.5"]`
- `["--profile-phase", "cheap:sdd-apply:anthropic/claude-sonnet-4"]`
- `[]` → sync base sin perfiles

### Migración post-`single-orchestrator-profiles`

**Contexto**: El cambio `single-orchestrator-profiles` (ya mergeado) limpió los 10 agentes
de fase y dejó sólo `sdd-orchestrator-{name}`. Gentle-AI nunca fue llamado con `--profile`
por lo que esos perfiles están incompletos en el entorno local.

Trigger: al cargar `listProfiles` en modo `generated-multi`, si `sdd-orchestrator-{name}` existe
pero no existen sus 10 `sdd-{phase}-{name}` → perfil marcado `incomplete`.

Ruta de migración:
1. Backup atómico de `opencode.json` → `~/.presett/backups/opencode-pre-migrate-{ts}.json`
2. Por cada perfil `incomplete`: extraer `model` actual del orquestador → `gentle-ai sync --profile {name}:{model}`
3. Re-leer y verificar que los 10 agentes de fase existen
4. Mostrar badge `Migrated` en card del perfil + toast al completar
5. Si `gentle-ai sync` falla: perfil queda `incomplete`; UI muestra badge `Incomplete` + botón "Reparar"

### Estados UI por estrategia

| Estado | `generated-multi` | `external-single-active` | `unknown` |
|---|---|---|---|
| Banner superior | — | "Perfiles gestionados externamente · Solo lectura" | "Estrategia no detectada · Configurar" |
| Botón "Nuevo perfil" | Habilitado | Deshabilitado (tooltip) | Deshabilitado |
| Edición de modelo | Habilitado | Deshabilitado | Deshabilitado |
| Sección de fases | Visible y editable | Visible y bloqueada | Oculta |
| Badge perfil incompleto | `Incomplete` + "Reparar" | — | — |
| Badge perfil migrado | `Migrated` (efímero, 1 sesión) | — | — |

---

## Affected Areas

| Área | Impacto | Descripción |
|---|---|---|
| `src/services/profileService.ts` | New | `detectProfileStrategy`, `ProfileStrategy` type, lógica de señales |
| `src/services/processService.ts` | Modified | `runGentleAiSync` acepta args opcionales |
| `src/adapters/opencode.ts` | Modified | `createProfile`, `updateProfile` → delegación CLI; nuevo `updateProfilePhase`; migración; bloqueos por estrategia |
| `src/app/api/profiles/route.ts` | Modified | POST create → bloqueable por estrategia; GET expone `strategy` |
| `src/app/api/profiles/[name]/route.ts` | Modified | PUT update → bloqueable; delega a `--profile` en generated-multi |
| `src/app/api/profiles/[name]/phases/[phase]/route.ts` | New | PUT → `updateProfilePhase`; bloqueable |
| `src/app/api/sync/route.ts` | Modified | POST sync → puede pasar args |
| `src/components/organisms/ModelsClient` | Modified | Banner de estrategia; sección per-fase; estados deshabilitados |
| `src/components/.../ProfileCreation` | Modified | Deshabilita en `external-single-active`; paso 2 de fases en `generated-multi` |

---

## Invariantes (nunca violar)

1. **gentle-orchestrator es inmutable** — ninguna operación lo borra, renombra ni modifica directamente.
2. **`sdd-{phase}-{name}` nunca se escribe desde PreSett** — pertenecen exclusivamente a gentle-ai.
3. **`sdd-orchestrator-{name}` nunca se escribe desde PreSett** — sólo vía `--profile`.
4. **`external-single-active` es estrictamente read-only** — ninguna escritura de ningún tipo.
5. **Backup atómico antes de cualquier escritura directa** — aplica a `deleteProfile` y migración.
6. **Un solo `--profile` o `--profile-phase` por invocación** — no concatenar en un único spawn.

---

## Risks

| Riesgo | Prob | Mitigación |
|---|---|---|
| Detección de estrategia produce falso positivo | Media | Señales combinadas (no single-signal); exponer estrategia detectada en UI Diagnostics |
| `gentle-ai sync --profile` falla en migración | Media | Backup previo; perfil queda `incomplete`; retry manual desde UI |
| gentle-ai cambia el contrato de `--profile-phase` | Media | Abstracción en `processService`; tests de integración con output real del CLI |
| Timeout en sync base + 10 fases en perfil nuevo | Media | Timeout 180s por operación; feedback de progreso en UI |
| `external-single-active` mal detectado bloquea al usuario | Baja | Override manual vía Settings → Strategy si el usuario detecta error |

---

## Rollback Plan

### `generated-multi`
1. Si la migración falla: `opencode.json` no cambia (backup previo); perfil queda `incomplete` con opción de retry.
2. Si `--profile` genera estado inesperado: `gentle-ai sync` (sin args) regenera el estado base; perfiles incompletos se re-detectan al recargar.
3. Revertir commit de PreSett elimina la delegación; los agentes ya escritos por gentle-ai permanecen en `opencode.json` y son válidos.

### `external-single-active`
1. PreSett nunca escribe nada → rollback es trivial: no hay cambios que deshacer.
2. Si la detección de estrategia es errónea: el usuario puede forzar `generated-multi` vía Settings hasta que `docs/opencode-profiles.md` precise las señales definitivas.

---

## Dependencies

- Gentle-AI CLI ≥ versión que soporta `--profile` y `--profile-phase` (referencia: `docs/opencode-profiles.md`)
- `probeGentleAiVersion` debe pasar antes de cualquier operación de creación/actualización en `generated-multi`
- Cambio `single-orchestrator-profiles` ya mergeado — la migración depende de ese estado en disco

---

## Success Criteria

- [ ] `detectProfileStrategy()` retorna el modo correcto según el estado de `opencode.json`
- [ ] En `generated-multi`: `createProfile` → `opencode.json` contiene 11 agents generados por gentle-ai, no por PreSett
- [ ] En `generated-multi`: `updateProfilePhase` → sólo el `model` del agente de fase cambia
- [ ] En `external-single-active`: toda operación de escritura retorna `403 Strategy:ReadOnly` sin tocar disco
- [ ] Perfiles `incomplete` post-migración local → tras migración, tienen los 11 agents completos
- [ ] `gentle-orchestrator` jamás es modificado ni eliminado por ninguna operación de perfil
- [ ] UI muestra banner, badges y controles correctos según estrategia detectada
- [ ] Tests unitarios pasan: `profileService`, `processService`, `opencode.ts` (adapter), APIs de profiles y phases
