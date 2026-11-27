# Design: Gentle Native Profile Management

## Technical Approach

Crear `profileStrategyService.ts` para detectar la estrategia activa leyendo `opencode.json`
en memoria (sin I/O extra). Aplicar guardrails a nivel de **ruta de API** (no de adaptador),
consistente con el patrón existente de `requireMutationOrigin`. Extender `runGentleAiSync`
con `args?: string[]` para delegar create/update al CLI. Exponer `strategy` e `incomplete`
en la respuesta de `listProfiles`. La migración de perfiles incompletos sigue el patrón lazy
ya establecido por `migrateProfiles` en `GET /api/profiles`.

---

## Architecture Decisions

| Decisión | Elegido | Rechazado | Razón |
|---|---|---|---|
| Capa de guardrails de estrategia | Ruta API (`route.ts`) | Adaptador / servicio | Consistent con `requireMutationOrigin`; adaptador queda testeable sin estado de estrategia |
| Ubicación del detector | `src/services/profileStrategyService.ts` (nuevo) | Dentro de `opencode.ts` o `route.ts` | Separación de responsabilidades; reutilizable por múltiples rutas |
| Extensión de `runGentleAiSync` | `args?: string[]` al mismo `processService.ts` | Nueva función por variante | Un solo punto de spawn; timeout/kill unificado |
| Caché de estrategia | Sin caché — re-detecta en cada request | Singleton de proceso / TTL fijo | Detección es O(1) sobre config ya en memoria; sin stale state |
| Error code para bloqueos de lectura | `STRATEGY_READONLY` → HTTP 403 | Reusar `WRITE_BLOCKED` (503) | Semántica correcta: política, no indisponibilidad |
| Endpoint de fase | Nueva ruta `[name]/phases/[phase]/route.ts` | PUT `[name]` con campo `phase` en body | RESTful; tests aislados; consistente con estructura existente |

---

## Data Flow

```
GET /api/profiles
  ├─ detectProfileStrategy(config) ──→ ProfileStrategy
  ├─ detectIncompleteProfiles(config) ──→ string[]  (orquestador sin sus 10 fases)
  └─ listProfiles(config) ──→ { profiles: [...{ strategy, incomplete }], strategy }

POST /api/profiles (create)
  ├─ detectProfileStrategy → external-single-active → 403 STRATEGY_READONLY
  └─ generated-multi → runGentleAiSync(["--profile", "{name}:{provider}/{model}"])

PUT /api/profiles/[name] (update orchestrator)
  └─ generated-multi → runGentleAiSync(["--profile", "{name}:{provider}/{model}"])

PUT /api/profiles/[name]/phases/[phase] (update fase)
  └─ generated-multi → runGentleAiSync(["--profile-phase", "{name}:{phase}:{provider}/{model}"])

DELETE /api/profiles/[name]
  ├─ external-single-active → 403 STRATEGY_READONLY
  └─ generated-multi → backup atómico → writeOpenCodeConfig (directo, sin CLI)

Repair flow (botón UI "Reparar"):
  POST /api/profiles/[name]/repair
  └─ backup atómico → runGentleAiSync(["--profile", "{name}:{model}"])
     ├─ ok   → perfil deja de ser incomplete
     └─ fail → opencode.json sin cambios; backup recuperable
```

---

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/services/profileStrategyService.ts` | Create | `detectProfileStrategy()`, `detectIncompleteProfiles()`, `ProfileStrategy` type |
| `src/services/processService.ts` | Modify | `runGentleAiSync(cmd?, args?)` — añade `args?: string[]`; timeout 180 s para ops de perfil |
| `src/adapters/opencode.ts` | Modify | `Profile` añade `strategy` + `incomplete`; `listProfiles` llama al detector; `createProfile`/`updateProfile` retornan `STRATEGY_READONLY` si external; añade `updateProfilePhase` |
| `src/app/api/profiles/route.ts` | Modify | GET expone `strategy`; POST: guardrail + delegación CLI |
| `src/app/api/profiles/[name]/route.ts` | Modify | PUT: guardrail + delegación CLI; DELETE: guardrail |
| `src/app/api/profiles/[name]/phases/[phase]/route.ts` | Create | PUT → `updateProfilePhase`; guardrail de estrategia |
| `src/app/api/profiles/[name]/repair/route.ts` | Create | POST → detecta modelo actual del orquestador → CLI `--profile` |
| `src/services/profilesApiService.ts` | Modify | `Profile` añade `strategy` + `incomplete`; añade `updateProfilePhase`, `repairProfile` |
| `src/components/organisms/ProfilesClient/profilesClient.tsx` | Modify | Consume `strategy`; guardrails UI; badge `Incomplete` + botón Reparar |
| `src/components/organisms/ModelsClient/modelsClient.tsx` | Modify | Sección per-fase (10 fases) visible/editable solo en `generated-multi` |

---

## Interfaces / Contracts

```ts
// profileStrategyService.ts
export type ProfileStrategy = "generated-multi" | "external-single-active" | "unknown";
export function detectProfileStrategy(config: OpenCodeConfig): ProfileStrategy;
export function detectIncompleteProfiles(config: OpenCodeConfig): string[];

// processService.ts (modificado)
export function runGentleAiSync(
  command?: string,
  args?: string[], // ["--profile", "cheap:anthropic/claude-haiku-3.5"]
): Promise<Result<SyncResult>>;  // timeout 180 s en ops de perfil

// opencode.ts — Profile (ampliado)
export interface Profile {
  name: string; displayName: string; active: boolean;
  modelCount: number; updatedAt: string;
  strategy: ProfileStrategy;  // nuevo
  incomplete: boolean;        // sdd-orchestrator-* sin sus 10 fases de fase
}

// Error code nuevo
// code: "STRATEGY_READONLY" → HTTP 403
// Aplica a: createProfile, updateProfile, updateProfilePhase, deleteProfile en external-single-active
```

---

## Testing Strategy

| Layer | Qué testear | Cómo |
|---|---|---|
| Unit | `detectProfileStrategy` — 3 ramas de señal | Jest; fixtures `OpenCodeConfig` en memoria |
| Unit | `detectIncompleteProfiles` — orquestador con/sin fases | Jest; fixtures |
| Unit | `runGentleAiSync` con args — array pasa intacto al spawn | Jest + mock `spawn` |
| Unit | Guardrails de ruta — `external-single-active` → 403 en POST/PUT/DELETE | Jest handler directo |
| Unit | `updateProfilePhase` — invoca CLI con args correctos; nunca escribe `opencode.json` | Jest + mock `runGentleAiSync` |
| Integration | Migración — perfil incomplete → CLI invocado; backup creado antes | Jest con `PRESETT_TEST_*` env vars |
| Integration | Rollback — CLI falla → `opencode.json` igual al backup; backup existe | Jest + CLI mock que falla |
| RED (proceso) | Nombre de perfil `../../evil` → 400 antes de spawn | Verificar regex valida antes de llamar CLI |
| RED (proceso) | Args al spawn son `string[]` separados, no interpolación de shell | Spy en `spawn`; assert cada elemento del array |

---

## Threat Matrix

El diseño spawna `gentle-ai` con args construidos desde input del usuario (profile name,
provider, model). `spawn()` en Node.js pasa args como array — sin shell string — por lo que
la inyección de shell clásica no aplica. El vector relevante es **inyección de argumentos**.

| Boundary | Casos adversariales | Aplicabilidad | Respuesta de diseño | RED tests |
|---|---|---|---|---|
| Documentation-like paths | N/A — sin rutas construidas desde input | N/A | — | — |
| Git repo selection | N/A — sin git | N/A | — | — |
| Commit state | N/A | N/A | — | — |
| Push state | N/A | N/A | — | — |
| PR commands | N/A | N/A | — | — |
| **Subprocess args (user input)** | Profile name `../../evil`; provider con espacios; model con `;rm -rf` | **Aplicable** | Regex `/^[a-z0-9_-]+$/` en nombre de perfil validada en ruta antes de spawn; provider/model validados contra catalog; `spawn` recibe array — nunca concatenación | Test: `../../evil` → 400 antes de spawn; test: spy en `spawn` assert args como `string[]` separados |

---

## Migration / Rollout

| Paso | Detalle |
|---|---|
| Detección | Lazy en cada `GET /api/profiles`; sin escritura hasta acción explícita |
| Perfiles incompletos | Badge `Incomplete` + botón "Reparar" en UI; trigger manual; NO automático |
| Backup antes de toda escritura directa | `~/.presett/backups/opencode-pre-{op}-{ts}.json`; atomic write |
| Rollback si CLI falla | `opencode.json` no modificado; backup recuperable; perfil queda `incomplete` |
| `external-single-active` | Sin migración — ninguna escritura jamás; rollback trivial |

---

## Open Questions

- [ ] ¿Gentle-AI ≥ versión mínima soporta `--profile` y `--profile-phase` de forma no interactiva? Confirmar antes de implementar (referencia: `docs/opencode-profiles.md` aún no existe en el repo).
- [ ] ¿Timeout de 180 s en `runGentleAiSync` para `--profile` es suficiente o debe escalar por número de fases?
- [ ] ¿El endpoint de repair debe ser idempotente si el perfil ya está completo (no-op seguro)?
