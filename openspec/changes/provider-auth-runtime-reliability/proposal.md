# Proposal: Provider Auth Runtime Reliability

## Intent

`/api/models` devuelve `connectedProviders: []` aunque `opencode providers list`
detecta 5 credenciales. La causa raíz es triple:

1. `exec("opencode providers list")` no hereda `HOME`/`USERPROFILE`/`PATH` del
   proceso padre en Windows → el binario no se encuentra → excepción silenciada.
2. El `catch` convierte cualquier fallo en `err({code:"FILE_MISSING"})` y la ruta
   lo ignora sin emitir señal alguna al cliente.
3. La respuesta `connectedProviders: []` es indistinguible entre "sin credenciales"
   y "fallo de invocación" → el marcador nunca se activa.

## Scope

### In Scope
- Invocación determinista del CLI en Windows: env explícita con `HOME`/`USERPROFILE`/`PATH`
- Código de error estructurado para fallos de CLI (distinguible de lista vacía)
- Campo de observabilidad sanitizado en la respuesta de `/api/models`
- Cobertura de tests unitarios para el path de fallo vs. lista vacía

### Out of Scope
- Cambios en el parser de salida ANSI (funciona correctamente)
- Autenticación de usuarios / OAuth flows
- Caché de providers (no requerida en este cambio)

## Capabilities

### New Capabilities
- `provider-auth-runtime`: Invocación de CLI con entorno heredado + respuesta estructurada con estado de detección

### Modified Capabilities
- `models-page`: Consume `providerAuthStatus` de la API para diferenciar error de lista vacía

## Approach

**Capa de servicio** (`src/services/providerAuthService.ts`):
- Reemplazar `exec(cmd, {})` por `spawn` (o `exec` con `env` explícito) incluyendo
  `HOME`, `USERPROFILE`, `PATH` de `process.env`. En Windows, añadir `shell: true`.
- Retornar `Result<ConnectedProvider[], ProviderAuthError>` con `code` específico
  (`CLI_NOT_FOUND` | `CLI_TIMEOUT` | `CLI_ERROR` | `PARSE_ERROR`) en lugar de
  siempre `FILE_MISSING`.

**Ruta API** (`src/app/api/models/route.ts`):
- Si `connectedResult` falla → incluir `providerAuthStatus: { ok: false, code, message }`
  en la respuesta (nunca bloquear el catálogo).
- Si `connectedResult.ok` → incluir `providerAuthStatus: { ok: true }`.
- El cliente distingue "lista vacía real" (`ok: true, connectedProviders: []`) de
  "fallo de detección" (`ok: false`).

**Sanitización**: `message` del error nunca expone rutas absolutas de credenciales
ni tokens; solo código de error + mensaje genérico.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/services/providerAuthService.ts` | Modified | Env heredado, códigos de error tipados |
| `src/app/api/models/route.ts` | Modified | Campo `providerAuthStatus` en respuesta |
| `src/services/__tests__/providerAuthService.test.ts` | New | Cobertura fallo vs. lista vacía |
| `src/app/api/models/__tests__/route.test.ts` | Modified | Escenarios con fallo de CLI |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `shell: true` expone superficie de inyección | Low | Comando es constante, sin interpolación de user-input |
| `USERPROFILE` vacío en CI/Docker | Low | Leer con fallback: `HOME ?? USERPROFILE ?? ""` |
| Cambio de shape rompe front (connectedProviders) | Low | Añadir campo, no reemplazar; tests de ruta actualizados |

## Rollback Plan

Revertir `providerAuthService.ts` a `exec` sin `env` y eliminar el campo
`providerAuthStatus` de la respuesta. El marcador vuelve al estado silencioso
anterior (no peor que el estado actual).

## Dependencies

- Node.js `child_process` (ya disponible)
- No se requiere ninguna dependencia nueva

## Success Criteria

- [ ] `GET /api/models` con CLI disponible → `connectedProviders` tiene ≥ 1 entrada y `providerAuthStatus.ok === true`
- [ ] `GET /api/models` con CLI no encontrado → `connectedProviders: []` y `providerAuthStatus.ok === false` con `code` no vacío
- [ ] Tests unitarios de `getConnectedProvidersSafe` diferencian timeout, not-found y parse-error
- [ ] El catálogo se devuelve correctamente aunque falle la detección de providers
- [ ] Sin secretos ni rutas absolutas en el campo `providerAuthStatus.message`
