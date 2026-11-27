# Design: Base Profile Switch Route

## Technical Approach

Ruta estática `POST /api/profiles/base/switch` + alias de segmento `"base"` en
`profilesApiService.switchProfile`. Replica el patrón ya establecido en
`getProfileDetail` y `updateProfile` (líneas 33 y 55 de `profilesApiService.ts`).
Sin cambios al adapter `opencode.switchProfile`, que ya acepta `name = ""`.

## Architecture Decisions

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Ruta estática `/base/switch` | Explícita, sin colisión con `[name]` (Next.js prioriza estáticas), sin params | ✅ Elegida |
| Catch-all `[...segments]` | Flexible pero introduce ambigüedad y lógica de dispatch innecesaria | ❌ Rechazada |
| Guard `name="base"` en el adapter | Contaminaría un perfil nombrado "base" si se permitiese crearlo | ❌ Rechazada |

## Data Flow

```
ProfilesClient.handleSwitch("")
  → profilesApiService.switchProfile("")
      segment = name === "" ? "base" : encodeURIComponent(name)
      → POST /api/profiles/base/switch
          → requireMutationOrigin (security guard)
          → adapters/opencode.switchProfile(configDir, "", backupDir)
              config.default_agent = "gentle-orchestrator"
              → writeOpenCodeConfig (atomic write + backup)
          → NextResponse.json({ ok: true })
```

## File Changes

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/app/api/profiles/base/switch/route.ts` | Crear | Handler estático `POST /api/profiles/base/switch`; delega a adapter con `name = ""` |
| `src/app/api/profiles/base/switch/__tests__/route.test.ts` | Crear | Tests unitarios de la nueva ruta (éxito, 403, error de adapter) |
| `src/services/profilesApiService.ts` | Modificar | Añadir guard `name === "" ? "base" : encodeURIComponent(name)` en `switchProfile` |
| `src/services/__tests__/profilesApiService.test.ts` | Modificar | Añadir caso `switchProfile("")` → URL `/profiles/base/switch` |

## Interfaces / Contracts

```typescript
// src/app/api/profiles/base/switch/route.ts
// Copia estructural de [name]/switch/route.ts — sin params
export async function POST(request: Request) {
  const originResult = requireMutationOrigin(request);
  if (!originResult.ok) {
    return NextResponse.json(buildSafeError(originResult.message), { status: originResult.status });
  }
  const result = await switchProfile(configDir(), "", backupDir());
  if (!result.ok) {
    const status = result.error.code === "SCHEMA_INVALID" ? 400 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true });
}

// src/services/profilesApiService.ts — línea 43 (modificación)
export async function switchProfile(name: string): Promise<unknown> {
  const segment = name === "" ? "base" : encodeURIComponent(name);
  return post(`/profiles/${segment}/switch`);
}
```

## Testing Strategy

| Capa | Qué probar | Enfoque |
|------|-----------|---------|
| Unidad — ruta | `POST /base/switch` devuelve `{ ok: true }` | Vitest, mock `switchProfile` adapter |
| Unidad — ruta | Devuelve 403 sin origin loopback | Mock `requireMutationOrigin` |
| Unidad — ruta | Propaga error de adapter con status 500 | Mock `switchProfile` → `{ ok: false }` |
| Unidad — servicio | `switchProfile("")` construye URL `/profiles/base/switch` | Mock `post`, assert URL |
| Regresión — servicio | `switchProfile("prod")` sigue usando `/profiles/prod/switch` | Misma suite, caso adicional |

## Threat Matrix

N/A — no se introduce ninguna frontera de routing externa, shell/subprocess, automatización VCS/PR ni clasificación de ejecutables. La nueva ruta aplica el mismo guard `requireMutationOrigin` que todas las demás rutas de mutación del proyecto.

## Migration / Rollout

Sin migración requerida. El cambio es aditivo: nueva ruta estática + corrección de segmento en el cliente. Los perfiles nombrados no se ven afectados.

## Open Questions

Ninguna — diseño completo y sin ambigüedades.
