# Design: Provider Auth Runtime Reliability

## Technical Approach

Reemplazar la invocación ciega de `exec("opencode providers list", {})` por una
invocación con entorno explícito y error tipado, y exponer el estado de detección
en la respuesta de `/api/models` sin bloquear el catálogo.

Tres capas coordinadas: (1) servicio → env + error tipado, (2) ruta → `providerAuthStatus`
en respuesta, (3) tipos → `ProviderAuthError` independiente de `ConfigError`.

## Architecture Decisions

| Decisión | Elección | Alternativa rechazada | Razón |
|----------|----------|-----------------------|-------|
| Tipo de error | Nuevo `ProviderAuthError` con `ProviderAuthErrorCode` | Extender `ConfigErrorCode` | Dominio distinto; evita contaminar el sistema de errores de configuración |
| Invocación subprocess | `exec` + `env: { ...process.env }` + `shell: true` en Windows | `spawn` con stdio pipes | Output es pequeño y completo; `spawn` añade complejidad sin beneficio real |
| Shape de respuesta | Campo `providerAuthStatus` aditivo | Error HTTP en fallo de CLI | El catálogo siempre se sirve; el error es observabilidad, no bloqueo |
| Sanitización | Mensaje constante por `code`; `cause` nunca serializado | Mensaje desde `cause.message` | Evita exponer rutas absolutas, tokens y detalles del entorno del servidor |

## Data Flow

```
GET /api/models
  ├── loadMergedModelCatalogSafe()          → Result<Catalog>
  └── getConnectedProvidersSafe()           → Result<ConnectedProvider[], ProviderAuthError>
        │
        ├── safeEnv = { HOME, USERPROFILE, PATH } de process.env
        ├── shell = process.platform === "win32"
        ├── exec("opencode providers list", { env: safeEnv, shell, timeout: 10_000 })
        │     ├── stdout → parseConnectedProviders() → ConnectedProvider[]  → ok(providers)
        │     └── catch  → classify(cause)           → ProviderAuthError    → err(typed)
        │           ├── ENOENT / exit 127  → code: "CLI_NOT_FOUND"
        │           ├── timeout kill       → code: "CLI_TIMEOUT"
        │           └── exit ≠ 0           → code: "CLI_ERROR"
        │
        └── route.ts:
              catalogResult.ok → 200 con catalog + providers
              connectedResult.ok  → connectedProviders: [...ids]
                                    providerAuthStatus: { ok: true }
              connectedResult.err → connectedProviders: []
                                    providerAuthStatus: { ok: false, code, message }
```

## File Changes

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/lib/types.ts` | Modificar | Añadir `ProviderAuthErrorCode` y `ProviderAuthError` |
| `src/services/providerAuthService.ts` | Modificar | `exec` con `env` explícito + `shell` en Win32; retornar `Result<ConnectedProvider[], ProviderAuthError>` con códigos tipados |
| `src/app/api/models/route.ts` | Modificar | Añadir `providerAuthStatus` al cuerpo JSON de la respuesta 200 |
| `src/services/__tests__/providerAuthService.test.ts` | Modificar | Añadir suite para `getConnectedProvidersSafe` con mock de `exec` (casos: not-found, timeout, exit≠0) |
| `src/app/api/models/__tests__/route.test.ts` | Modificar | Añadir aserciones de `providerAuthStatus` en los tests existentes de fallo y éxito |

## Interfaces / Contracts

```typescript
// src/lib/types.ts — añadir junto a ConfigErrorCode
export type ProviderAuthErrorCode =
  | "CLI_NOT_FOUND"
  | "CLI_TIMEOUT"
  | "CLI_ERROR"
  | "PARSE_ERROR";

export interface ProviderAuthError {
  code: ProviderAuthErrorCode;
  message: string; // constante genérica por código; nunca incluye rutas ni tokens
}

// src/services/providerAuthService.ts — firma actualizada
export async function getConnectedProvidersSafe(): Promise<
  Result<ConnectedProvider[], ProviderAuthError>
>;

// src/app/api/models/route.ts — shape de respuesta 200
interface ModelsResponse {
  providers: string[];
  catalog: Record<string, Record<string, string[]>>;
  connectedProviders: string[];
  providerAuthStatus: { ok: true } | { ok: false; code: ProviderAuthErrorCode; message: string };
}
```

## Testing Strategy

| Capa | Qué probar | Enfoque |
|------|-----------|---------|
| Unit — `getConnectedProvidersSafe` | CLI not-found → `CLI_NOT_FOUND`; timeout kill → `CLI_TIMEOUT`; exit≠0 → `CLI_ERROR`; env heredado presente | `vi.mock("node:child_process")` en `providerAuthService.test.ts` |
| Unit — sanitización | `message` no contiene rutas absolutas ni tokens | Regex negativa sobre `message` en los tres casos de fallo |
| Integration — ruta | `providerAuthStatus.ok === true` cuando CLI ok; `providerAuthStatus.ok === false` con `code` cuando falla; catálogo disponible en ambos casos | Extender tests existentes en `route.test.ts` con aserción sobre `body.providerAuthStatus` |
| RED tests — amenazas | Env sin `HOME`/`USERPROFILE` no produce inyección; comando constante no interpola input | Tests negativos en suite de `getConnectedProvidersSafe` |

## Threat Matrix — Subprocess

| Amenaza | Aplicable | Mitigación planificada | Tests RED |
|---------|-----------|------------------------|-----------|
| Command injection via `shell: true` | **Aplicable** | Comando es literal constante `"opencode providers list"`; sin interpolación de input de usuario; validado por inspección estática | Test que verifica que la invocación recibe exactamente la cadena constante sin concatenación |
| Env variable leakage (secrets en `env`) | **Aplicable** | `safeEnv` extrae solo `HOME`, `USERPROFILE`, `PATH`; nunca `OPENAI_API_KEY` ni similares | Test que verifica que `safeEnv` no contiene claves que coincidan con `/key|token|secret|password/i` |
| Credential path exposure en stderr | **Aplicable** | `cause` de `exec` nunca se serializa; `message` es constante genérica por `code` | Test que verifica que ningún campo de la respuesta contiene una ruta absoluta |
| Timeout DoS (CLI colgado) | **Aplicable** | `timeout: 10_000` ya presente; se mapea a `CLI_TIMEOUT` en lugar de silencio | Test que mocka kill por timeout y verifica `code === "CLI_TIMEOUT"` |
| ENOENT / PATH no resuelto en Windows | **Aplicable** | `shell: true` en `win32` + `PATH` explícito de `process.env` | Test con mock de `ENOENT` → `CLI_NOT_FOUND` |
| Path traversal | N/A — sin manipulación de rutas de archivo en subprocess | — | — |
| Privilege escalation | N/A — `opencode` es CLI de espacio de usuario; no requiere elevación | — | — |

## Migration / Rollout

No se requiere migración de datos ni feature flag.

El campo `providerAuthStatus` es **aditivo**: los clientes que no lo consuman siguen funcionando.
El campo `connectedProviders` mantiene su semántica actual: `[]` en fallo conserva
el comportamiento previo para clientes no actualizados.

## Open Questions

- [ ] ¿El runner de CI en Windows tiene `opencode` en PATH? Si no, los tests de integración E2E deben saltarse la invocación real vía variable de entorno de CI.
