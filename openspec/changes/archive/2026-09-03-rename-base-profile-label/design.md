# Design: Rename Base Profile Label

## Technical Approach

Cambio de un único literal en `listProfiles` (adaptador OpenCode) y actualización de las dos aserciones de test que dependen del texto `"Base"`. El resto del pipeline —API, servicios, UI— ya consume `displayName` del adaptador sin redefinirlo.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Cambiar literal en `listProfiles` | Mínimo; única fuente de verdad del `displayName` | ✅ Elegida |
| Capa de i18n / constante compartida | Consistencia multi-idioma | Fuera de alcance; sin i18n actual |
| Renombrar `name: ""` a `"base"` | Rompería rutas, API y contratos existentes | Rechazada explícitamente |

## Data Flow

```
opencode.json (config)
       │
       ▼
listProfiles()  ← única línea que cambia
  profiles.set("", { name: "", displayName: "Gentle-Orchestrator", ... })
       │
       ▼
GET /api/profiles/route.ts  →  ProfilesClient  →  profilesClientView
                                                        │
                                      profile.displayName  ("Gentle-Orchestrator")
                                                        │
                                             tarjeta + título editor
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/adapters/opencode.ts` | Modify | Línea 282: `"Base"` → `"Gentle-Orchestrator"` |
| `src/adapters/__tests__/profiles.test.ts` | Modify | Añadir aserción `displayName === "Gentle-Orchestrator"` para `name: ""` en `listProfiles` |
| `src/components/organisms/ProfilesClient/__tests__/profilesClientView.test.tsx` | Modify | Línea 382: fixture `displayName: "Base"` → `"Gentle-Orchestrator"` |

## Interfaces / Contracts

El tipo `Profile` no cambia. Solo varía el valor del campo en tiempo de ejecución.

```ts
// src/adapters/opencode.ts — antes
profiles.set("", { name: "", displayName: "Base", modelCount: 0 });

// después
profiles.set("", { name: "", displayName: "Gentle-Orchestrator", modelCount: 0 });
```

```ts
// src/adapters/__tests__/profiles.test.ts — aserción nueva dentro del test existente
const base = profiles.find((p) => p.name === "");
expect(base?.displayName).toBe("Gentle-Orchestrator");
```

```ts
// src/components/organisms/ProfilesClient/__tests__/profilesClientView.test.tsx — fixture
{ name: "", displayName: "Gentle-Orchestrator", active: true, modelCount: 14, updatedAt: "2026-01-01T00:00:00.000Z" }
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `listProfiles` devuelve `displayName: "Gentle-Orchestrator"` para `name: ""` | Añadir `expect(base?.displayName).toBe("Gentle-Orchestrator")` al test existente `src/adapters/__tests__/profiles.test.ts` |
| Unit | Vista no rompe con el nuevo `displayName` | Actualizar fixture en `profilesClientView.test.tsx:382` |
| Smoke | El test completo sigue verde | `npm test` sin filtros |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Rollback = revertir la línea en `listProfiles`; sin cambio de contrato de API ni datos persistidos.

## Open Questions

- Ninguna.
