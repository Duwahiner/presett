# Propuesta: last-sync-timestamp

## Intención

El dashboard muestra la fecha del backup más reciente donde debería mostrar la fecha de la última sincronización exitosa. Esto surge del issue #110: `gentle-ai sync` no persiste ningún timestamp y el dashboard reutiliza `manifest.created_at`, que es una fecha de escritura de snapshot, no de sincronización.

## Alcance

### En alcance
- Registro dedicado `~/.presett/sync-state.json` con campo `lastSuccessfulSyncAt` (ISO 8601), escrito solo tras `exitCode === 0`.
- Escritura atómica (archivo temporal + rename) con servicio pequeño de lectura/escritura validada.
- Nuevo endpoint de lectura o composición server-side para exponer el timestamp al dashboard sin acoplarlo a `BackupInfo`.
- Tarjeta independiente en el dashboard que muestra la última sincronización; fallback visible `Nunca` ante archivo ausente, JSON inválido o timestamp inválido.
- Revalidación/refresco del dashboard tras `POST /api/sync` exitoso para mostrar el nuevo valor sin navegación.
- Fixtures deterministas separadas para pruebas del dashboard que incluyan el nuevo campo.
- **Política de degradación confirmada**: si `gentle-ai sync` es exitoso pero falla la persistencia del timestamp, la respuesta HTTP conserva éxito y se devuelve/muestra advertencia explícita. Nunca se oculta el éxito del comando.

### Fuera de alcance
- Modificar `~/.gentle-ai/state.json` o el esquema de manifests de backup.
- Cambiar el significado de `BackupInfo.timestamp` o `lastBackup`.
- Telemetría, historial de sincronizaciones o reintentos automáticos.

## Capacidades

### Capacidades nuevas
- `sync-state-persistence`: registro y servicio dedicado de timestamp de sincronización bajo `~/.presett`.

### Capacidades modificadas
- `dashboard-page`: tarjeta de última sincronización independiente de `lastBackup`.

## Enfoque

1. Añadir `SYNC_STATE_PATH` en `src/lib/paths.ts`.
2. Crear `src/services/syncStateService.ts` con lectura tolerante y escritura atómica.
3. En `src/app/api/sync/route.ts`, tras validar `exitCode === 0`, llamar a `writeSyncTimestamp`; si falla, continuar con éxito HTTP y adjuntar `warning` en la respuesta JSON.
4. En `src/app/page.tsx`, leer `syncState` en paralelo con backups y pasar el timestamp al dashboard como prop opcional.
5. En `dashboardView.tsx`, renderizar tarjeta `Última sincronización` con el nuevo valor, sin leer `BackupInfo`.
6. Revalidar la ruta `/` en el handler de sync exitoso.

## Áreas afectadas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `src/lib/paths.ts` | Modificado | Agregar `SYNC_STATE_PATH` |
| `src/services/syncStateService.ts` | Nuevo | Lectura/escritura atómica de `sync-state.json` |
| `src/app/api/sync/route.ts` | Modificado | Persistir timestamp + advertencia en fallo |
| `src/app/page.tsx` | Modificado | Leer timestamp y componer props |
| `src/components/organisms/Dashboard/dashboardTypes.ts` | Modificado | Campo opcional `lastSyncAt` |
| `src/components/organisms/Dashboard/dashboardView.tsx` | Modificado | Tarjeta independiente de sincronización |
| `openspec/specs/dashboard-page/spec.md` | Delta | Semántica de timestamp de sync |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| JSON truncado por escritura concurrente | Baja | Escritura atómica con archivo temporal |
| Persistir antes de validar `exitCode` | Media | Orden de operaciones especificado y probado |
| Dashboard no se refresca tras sync | Media | Revalidación explícita de `/` en handler |
| Auditoría no determinista por timestamp real | Baja | Fixtures separadas con valor congelado |

## Plan de rollback

Revertir los commits de `syncStateService.ts`, `paths.ts` y `route.ts`. El archivo `~/.presett/sync-state.json` puede eliminarse sin afectar backups ni el estado de Gentle-AI. El dashboard vuelve a no mostrar tarjeta de sincronización.

## Dependencias

- `~/.presett/` debe existir o crearse si no existe antes de la primera escritura.

## Criterios de éxito

- [ ] `POST /api/sync` exitoso persiste timestamp ISO en `~/.presett/sync-state.json`.
- [ ] `POST /api/sync` exitoso con fallo de persistencia devuelve `200` con campo `warning`.
- [ ] `POST /api/sync` fallido no escribe ni actualiza `sync-state.json`.
- [ ] Dashboard muestra tarjeta de última sincronización independiente de `lastBackup`.
- [ ] Tarjeta muestra `Nunca` cuando el archivo está ausente o el JSON es inválido.
- [ ] Dashboard refleja el nuevo timestamp tras sync sin navegación manual.
- [ ] Pruebas de `route.test.ts` cubren los tres escenarios: éxito+persistencia, éxito+fallo de persistencia, fallo de sync.
