# Diseño: models-route-flaky-test

## Enfoque técnico

Eliminar la llamada al CLI real `opencode providers list` de la suite de integración de la ruta, sustituyéndola por un doble de módulo Vitest (`vi.mock`) declarado antes de cualquier importación de la ruta. Todos los cambios se limitan a `route.test.ts`; no se toca código productivo salvo evidencia posterior de colisiones que lo exija.

## Decisiones de arquitectura

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| `vi.mock('@/services/providerAuthService', ...)` a nivel de módulo | Vitest lo eleva (hoist) antes de los imports; el módulo queda sustituido en todo el archivo sin reimportación | **Elegida** — es el mecanismo canónico para sustituir dependencias de módulo en Vitest |
| `vi.spyOn(service, 'getConnectedProvidersSafe')` por caso | No requiere hoist, pero el spyOn post-import no intercepta la referencia ya capturada por `route.ts` en el cierre del módulo | **Descartada** — la referencia interna de `route.ts` no cambia en tiempo de ejecución |
| Inyección de dependencias en código productivo | Aisla completamente; diseño más robusto | **Descartada** — desproporcionada para corregir el timeout sin reproducción de carrera interna |
| `vi.stubEnv` para variables de entorno | Restauración automática con `vi.unstubAllEnvs()`; evita colisiones inter-archivo por `process.env` compartido | **Elegida como complemento** — reemplaza los `delete process.env.*` manuales del `afterEach` |
| Serializar la suite completa con `pool: 'forks'` | Mitigación operacional, no causa corregida; ralentiza el CI | **Descartada salvo evidencia** — solo se aplica al grupo afectado si la corrida repetida lo reproce |

## Flujo de datos

```
Vitest evalúa route.test.ts
  │
  ├─ vi.mock('@/services/providerAuthService')   ← hoist: antes del import
  │     └─ fábrica: { getConnectedProvidersSafe: vi.fn() }
  │
  ├─ import { GET } from '../route'              ← route.ts recibe el módulo simulado
  │
  beforeEach:
    vi.stubEnv('PRESETT_TEST_*', tempDir)        ← env aislado por caso
    clearServerModelCatalogCache()               ← caché de módulo limpio
    vi.mocked(getConnectedProvidersSafe)
      .mockResolvedValue(ok([...]))              ← valor por caso
  │
  GET()
    ├─ loadMergedModelCatalogSafe  ← usa fixture de archivo controlado
    └─ getConnectedProvidersSafe   ← devuelve valor mock (sin CLI real)
  │
  afterEach:
    clearServerModelCatalogCache()
    vi.resetAllMocks()                           ← estado de mock limpio
    vi.unstubAllEnvs()                           ← env restaurado
    rm(tempDir…)                                 ← directorios eliminados
```

## Archivos afectados

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/app/api/models/__tests__/route.test.ts` | Modificar | Añadir `vi.mock` hoisted, `vi.stubEnv`, caso de fallo de proveedor, `vi.resetAllMocks()` + `vi.unstubAllEnvs()` en `afterEach` |
| `src/services/__tests__/providerAuthService.test.ts` | Sin cambios | Mantiene cobertura del parser/normalizador |
| `src/app/api/models/route.ts` | Sin cambios | Código productivo intacto salvo evidencia de colisión de caché interna |
| `vitest.config.ts` | Sin cambios | Solo lectura para confirmar paralelismo; sin serialización global |

## Contratos / interfaces

El mock debe implementar la misma firma que `getConnectedProvidersSafe` en producción:

```typescript
// Contrato del mock — debe coincidir con src/services/providerAuthService.ts
import type { Result } from "@/lib/types";
import type { ConnectedProvider } from "@/services/providerAuthService";

// Caso éxito — proveedor determinista
const MOCK_PROVIDERS: ConnectedProvider[] = [
  { name: "OpenAI", authType: "oauth" },
];

// Caso fallo — sin bloquear catálogo
const MOCK_ERROR: Result<ConnectedProvider[]> = err({
  code: "FILE_MISSING",
  message: "Proveedor no disponible (test)",
});
```

El `vi.mock` a nivel de módulo declara la fábrica con `vi.fn()` sin implementación por defecto; cada caso la sobreescribe mediante `vi.mocked(...).mockResolvedValue(...)` en el bloque `beforeEach` o al inicio del `it`.

## Estrategia de pruebas

| Capa | Qué probar | Cómo |
|------|-----------|------|
| Integración de ruta (éxito) | `GET` devuelve `providers`, `catalog`, `connectedProviders` con mock activo | `vi.mocked(...).mockResolvedValue(ok([...]))` |
| Integración de ruta (fallo de proveedor) | `GET` devuelve catálogo válido aunque `getConnectedProvidersSafe` rechace | `vi.mocked(...).mockResolvedValue(err({...}))` |
| Sin CLI real | La suite no ejecuta procesos externos | El mock reemplaza la llamada; `vi.mock` intercepta antes del import |
| Paralelismo repetido (RED) | Cinco corridas `vitest run` paralelas sin timeout ni colisión de env | Script de validación: `for i in {1..5}; do npx vitest run --reporter=verbose & done; wait` |
| Cobertura del parser | `parseConnectedProviders` y `normalizeProviderName` cubiertos | `providerAuthService.test.ts` sin cambios |

## Matriz de amenazas

N/A — no hay routing dinámico, subprocesos nuevos, automatización VCS/PR, clasificación de ejecutables ni integración de procesos. El cambio elimina el único subproceso existente en la suite; no introduce ninguno nuevo.

## Migración / despliegue

Sin migración requerida. El cambio es exclusivamente en archivos de prueba; no hay datos de usuario, esquemas ni contratos de producto afectados.

## Preguntas abiertas

- [ ] Si la corrida paralela repetida reproduce colisiones de `process.env` (los archivos `config/route.test.ts` y `profiles/route.test.ts` comparten las mismas variables), se evaluará si `vi.stubEnv` es suficiente o se requiere encapsular esos archivos en un `project` de Vitest o un pool dedicado — decisión postergada a evidencia real.
