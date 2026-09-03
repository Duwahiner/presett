## Exploration: last-sync-timestamp

### Current State
La ruta `POST /api/sync` ejecuta `gentle-ai sync` mediante `runGentleAiSync`, rechaza códigos de salida distintos de cero y solo después limpia la caché del catálogo; actualmente no persiste ninguna marca temporal de sincronización. El dashboard carga configuración, perfiles y backups, y calcula `lastBackup` ordenando `manifest.created_at`. Por tanto, la tarjeta de sincronización reutiliza indirectamente la fecha del backup más reciente, que representa un snapshot previo a una escritura y no una sincronización exitosa.

El estado persistido existente es `~/.gentle-ai/state.json`, con lectura tolerante pero sin escritura general desde este flujo; también existe `~/.presett/diagnostics.json` para el estado de diagnósticos. La solución debe conservar ambos contratos y elegir un registro dedicado o una extensión opcional de un estado existente sin hacer que un archivo ausente invalide el dashboard.

### Affected Areas
- `src/app/api/sync/route.ts` — punto único del flujo HTTP donde se conoce que `gentle-ai sync` terminó con éxito; la persistencia debe ocurrir después de validar `exitCode === 0` y antes de devolver éxito.
- `src/services/processService.ts` — mantiene el contrato de ejecución y sus resultados; no debe convertir una salida no cero ni un timeout en sincronización exitosa.
- `src/lib/paths.ts` — lugar central para introducir una ruta estable y configurable del registro persistido, preferiblemente bajo `~/.presett`.
- `src/services/stateService.ts` y/o un servicio nuevo de timestamp — lectura/escritura tolerante, validación ISO y escritura segura sin acoplar el dashboard al esquema completo de `state.json`.
- `src/app/page.tsx` — debe solicitar el timestamp persistido además de backups y construir dos valores semánticamente independientes.
- `src/components/organisms/Dashboard/dashboardTypes.ts` — ampliar `DashboardStats` de forma compatible, con un valor explícito para la última sincronización y fallback para consumidores existentes.
- `src/components/organisms/Dashboard/dashboardView.tsx` — mostrar la fecha de sincronización persistida en su propia tarjeta, sin leer ni derivar de `BackupInfo.timestamp`.
- `src/services/backupsApiService.ts` — si el dashboard obtiene el dato por API, agregar un contrato opcional compatible; no cambiar el significado de `BackupInfo.timestamp`.
- `src/app/api/sync/__tests__/route.test.ts` — probar persistencia únicamente tras éxito, ausencia de escritura en error, timeout o CLI no disponible, y conservar la respuesta actual.
- `src/services/__tests__/processService.test.ts` — mantener las pruebas del proceso y aclarar que el código de salida sigue siendo la autoridad del éxito.
- `src/components/organisms/Dashboard/__tests__/dashboard.test.tsx` y pruebas de `src/app/page.tsx` — verificar renderizado independiente, ausencia de valor y compatibilidad de props.
- `openspec/specs/dashboard-page/spec.md` — la especificación vigente del dashboard no cubre todavía la semántica de timestamps y necesitará un delta en la fase de spec.

### Approaches
1. **Registro dedicado de última sincronización en `~/.presett`** — crear un archivo pequeño, por ejemplo `sync-state.json`, con un campo ISO `lastSuccessfulSyncAt`; la ruta de sync lo actualiza solo después de `exitCode === 0` y el dashboard lo lee mediante una API o servicio de servidor.
   - Pros: separación semántica y de ciclo de vida; no modifica el esquema externo de `state.json` ni los manifests de backup; fácil de validar, probar y migrar; los fallos de lectura no rompen el dashboard.
   - Cons: agrega una ruta y un servicio persistente; requiere definir escritura atómica y permisos.
   - Effort: Medium

2. **Extender `~/.gentle-ai/state.json` con un campo opcional** — persistir `last_successful_sync` en el estado existente y exponerlo al dashboard.
   - Pros: un único archivo de estado y menos rutas nuevas.
   - Cons: acopla PreSett a un archivo administrado por Gentle-AI; una escritura concurrente puede sobrescribir cambios externos; exige preservar JSON desconocido y compatibilidad de esquema; mezcla estado de instalación con telemetría de ejecución.
   - Effort: Medium

### Recommendation
Recomiendo el registro dedicado bajo `~/.presett`, con un servicio pequeño de lectura/escritura validada y escritura atómica. La ruta `POST /api/sync` debe ejecutar, validar el código cero y persistir `new Date().toISOString()` únicamente en ese camino; si la persistencia falla, debe tratarse como error del endpoint o definirse explícitamente como advertencia, pero nunca anunciar un timestamp que no se haya guardado. La lectura del dashboard debe tolerar archivo ausente, JSON inválido o timestamp inválido y mostrar `Nunca`/equivalente localizado, mientras `lastBackup` continúa derivándose exclusivamente de manifests. Para preservar compatibilidad, los nuevos campos de tipos y respuestas deben ser opcionales o tener fallback, y las fixtures de auditoría deben recibir un valor determinista independiente.

### Risks
- Una escritura no atómica o concurrente puede dejar JSON truncado; usar archivo temporal y rename, y cubrirlo con pruebas de IO inyectable.
- Persistir antes de validar el código de salida registraría ejecuciones fallidas; el orden de operaciones debe quedar especificado y probado.
- Si la persistencia falla después de un sync real, el resultado de la operación y el estado visible pueden divergir; debe definirse el contrato HTTP y el mensaje al usuario.
- Leer backups para completar el timestamp reintroduciría el bug semántico; no debe existir fallback desde `manifest.created_at`.
- El dashboard es una página de servidor y el botón de sync vive en el layout; tras una sincronización exitosa puede requerirse revalidación/refresco para mostrar el nuevo valor sin navegación.
- El modo de auditoría necesita fixtures congeladas para evitar renders no deterministas.

### Ready for Proposal
Sí — el cambio está suficientemente delimitado para una propuesta. La propuesta debe fijar la ubicación/formato del registro dedicado, el contrato ante fallo de persistencia, el mecanismo de exposición (endpoint de lectura o composición server-side), y los criterios de compatibilidad y refresco del dashboard.
