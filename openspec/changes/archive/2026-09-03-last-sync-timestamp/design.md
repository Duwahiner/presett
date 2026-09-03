# Diseño: last-sync-timestamp

## Enfoque técnico

Registro dedicado `~/.presett/sync-state.json` con campo `lastSuccessfulSyncAt` (ISO 8601), escrito atómicamente (tmp → rename) solo tras `exitCode === 0`. El dashboard compone el valor en el servidor (`page.tsx`) en paralelo con los backups y lo pasa como prop opcional al componente. La ruta de sync revalida `/` con `revalidatePath` para forzar el re-render sin navegación manual. El servicio sigue el patrón de `PathContext` ya establecido en `paths.ts` y la tolerancia de lectura de `stateService.ts`.

---

## Decisiones de arquitectura

| Decisión | Opción elegida | Alternativa descartada | Justificación |
|----------|---------------|----------------------|--------------|
| Almacenamiento | `~/.presett/sync-state.json` dedicado | Extender `~/.gentle-ai/state.json` | Separación de ciclo de vida; evita acoplar PreSett a un archivo gestionado por Gentle-AI; fallo de lectura no rompe el dashboard |
| Exposición al dashboard | Composición server-side en `page.tsx` | Nuevo endpoint `GET /api/sync-state` | Sin round-trip de cliente; no rompe SSR; no requiere nueva ruta pública |
| Refresco post-sync | `revalidatePath('/')` en el handler | Navegación client-side o SSE | Integración nativa Next.js; no requiere estado en cliente; el botón sync ya existe en `modelsClient.tsx` y recibe el éxito |
| Escritura atómica | `writeFile(tmp) → rename(tmp, dest)` | `writeFile(dest)` directo (como `diagnosticsService`) | Evita JSON truncado si el proceso muere; diagnósticos no tienen el mismo riesgo de concurrencia |
| Contrato warning | HTTP 200 + campo `warning` en JSON | HTTP 207 o error 500 | Una sync exitosa no debe reportarse como fallo; el usuario recibe información sin ver error; alineado con la política aprobada |

---

## Flujo de datos

```
POST /api/sync
  └─ requireMutationOrigin(request)       [seguridad existente]
  └─ runGentleAiSync(command)
       ├─ result.ok === false  → 503/500  [sin escritura]
       ├─ exitCode !== 0       → 500      [sin escritura]
       └─ exitCode === 0
            └─ writeSyncTimestamp(ctx)    [atomic: tmp → rename]
                 ├─ ok    → clearServerModelCatalogCache()
                 │          revalidatePath('/')
                 │          NextResponse.json(result.value)
                 └─ err   → clearServerModelCatalogCache()
                            revalidatePath('/')
                            NextResponse.json({...result.value, warning: "..."})

GET / (server component)
  └─ Promise.allSettled([getConfig(), listProfiles(), listBackups(), readSyncState(ctx)])
       └─ buildDashboardData(config, profiles, backups, syncAt?)
            └─ DashboardStats { ..., lastSyncAt?: string }
                 └─ <DashboardView stats={...} />
                      └─ <Stat label="Última sincronización" value={lastSyncAt ?? t("dashboard_last_sync_never")} />
```

---

## Cambios de archivos

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/lib/paths.ts` | Modificar | Añadir `syncStatePath(ctx?: PathContext): string` → `~/.presett/sync-state.json` |
| `src/services/syncStateService.ts` | Crear | `readSyncState(ctx?)` tolerante; `writeSyncTimestamp(ctx?)` atómica; ambas usan `PathContext` |
| `src/app/api/sync/route.ts` | Modificar | Llamar `writeSyncTimestamp` + `revalidatePath('/')` tras `exitCode === 0`; campo `warning` en fallo de persistencia |
| `src/components/organisms/Dashboard/dashboardTypes.ts` | Modificar | `lastSyncAt?: string` en `DashboardStats` |
| `src/app/page.tsx` | Modificar | `readSyncState()` en paralelo en `fetchDashboardData`; pasar `lastSyncAt` a `buildDashboardData`; fixture de auditoría `AUDIT_FIXTURE_LAST_SYNC` |
| `src/components/organisms/Dashboard/dashboardView.tsx` | Modificar | Nueva tarjeta `Stat` para `lastSyncAt`; nunca lee `BackupInfo` |
| `src/lib/visual-audit/fixtures.ts` | Modificar | Exportar `AUDIT_FIXTURE_LAST_SYNC` con valor congelado derivado de `AUDIT_FIXTURE_TIMESTAMP` |
| `src/services/__tests__/syncStateService.test.ts` | Crear | Pruebas unitarias: lectura tolerante, escritura atómica, fallo de escritura |
| `src/app/api/sync/__tests__/route.test.ts` | Modificar | Tres escenarios: éxito+persistencia, éxito+fallo de persistencia, sync fallido |

---

## Interfaces y contratos

```typescript
// src/services/syncStateService.ts
interface SyncState {
  lastSuccessfulSyncAt: string; // ISO 8601
}

// Lee sync-state.json; devuelve la fecha ISO si es válida, undefined en cualquier fallo
export async function readSyncState(ctx?: PathContext): Promise<string | undefined>

// Escribe atómicamente: writeFile(tmp) → rename(tmp, dest); crea ~/.presett si no existe
export async function writeSyncTimestamp(ctx?: PathContext): Promise<Result<void>>
```

```typescript
// src/components/organisms/Dashboard/dashboardTypes.ts (delta)
export interface DashboardStats {
  modelCount: number;
  profileCount: number;
  backupCount: number;
  lastBackup: string;
  lastSyncAt?: string; // ISO 8601 | undefined → muestra "Nunca"
}
```

```typescript
// src/app/api/sync/route.ts — respuesta con advertencia (delta)
// SyncResult existente sin cambios; warning solo presente en fallo de persistencia
type SyncRouteResponse = SyncResult & { warning?: string };
```

---

## Estrategia de pruebas

| Capa | Qué se prueba | Enfoque |
|------|--------------|---------|
| Unitaria | `readSyncState` — archivo ausente, JSON inválido, fecha inválida | Mockear `fs/promises` via `PathContext` inyectable |
| Unitaria | `writeSyncTimestamp` — escritura atómica exitosa | Verificar orden: `writeFile(tmp)` → `rename(tmp, dest)` |
| Unitaria | `writeSyncTimestamp` — fallo de rename | Mock `rename` con throw; verificar `err(...)` retornado |
| Integración | `POST /api/sync`: éxito + persistencia | Mock `runGentleAiSync ok(0)` + `writeSyncTimestamp ok`; verificar sin `warning`, `revalidatePath` llamado |
| Integración | `POST /api/sync`: éxito + fallo de persistencia | Mock `writeSyncTimestamp err`; verificar HTTP 200 + campo `warning` presente |
| Integración | `POST /api/sync`: sync fallido | Mock `exitCode !== 0`; verificar que `writeSyncTimestamp` NO se llama |
| Componente | Dashboard con `lastSyncAt` definido | Prop con ISO; tarjeta muestra valor formateado |
| Componente | Dashboard sin `lastSyncAt` | Prop ausente; tarjeta muestra `Nunca` |
| Componente | Backup reciente pero sin sync | `lastBackup` visible; tarjeta sync no reutiliza `lastBackup` |

---

## Matriz de amenazas

Este cambio modifica el flujo post-subproceso de `gentle-ai sync` (proceso externo existente). No introduce nuevas rutas shell, git, ni PR.

| Frontera | Aplicabilidad | Razón |
|----------|--------------|-------|
| Rutas tipo documentación | N/A | `sync-state.json` es un archivo de datos privado; sin clasificación de ejecutables |
| Selección de repositorio git | N/A | No se introducen operaciones git |
| Estado de commit | N/A | No se crean commits |
| Estado de push | N/A | No se realizan push |
| Comandos de PR | N/A | No hay automatización de PR |

Comportamiento seguro esperado en la escritura a disco: si `writeSyncTimestamp` falla (permisos, disco lleno, rename fallido), el handler retorna HTTP 200 con `warning` y no interrumpe el flujo principal. El path de escritura se deriva exclusivamente de `PathContext` bajo `~/.presett`; ningún input del usuario o de la respuesta del CLI alimenta la ruta.

---

## Migración y despliegue

No se requiere migración. El archivo `sync-state.json` se crea en la primera sincronización exitosa. Si el archivo está ausente, el dashboard muestra `Nunca` (degradación visible y no bloqueante). El rollback consiste en revertir los commits de `syncStateService.ts`, `paths.ts` y `route.ts`; el archivo `~/.presett/sync-state.json` puede eliminarse sin afectar backups ni estado de Gentle-AI.

---

## Preguntas abiertas

Ninguna. El diseño está desbloqueado para la fase de tareas.
