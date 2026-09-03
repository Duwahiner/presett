# Delta para dashboard-page

## REQUISITOS AÑADIDOS

### Requisito: Última sincronización independiente del último backup

El sistema DEBE mostrar `Última sincronización` en una tarjeta separada de `Último backup` y NO DEBE derivarla de `BackupInfo.timestamp`.

#### Escenario: Se muestran dos fechas semánticamente distintas
- DADO que el dashboard recibe un timestamp de sincronización y backups con su propia fecha
- CUANDO la página renderiza
- ENTONCES `Último backup` y `Última sincronización` se muestran como valores independientes

#### Escenario: El backup no sustituye la sincronización
- DADO que existe un backup reciente pero no un timestamp de sync
- CUANDO el dashboard renderiza
- ENTONCES la tarjeta de sincronización no reutiliza la fecha del backup

### Requisito: Fallback visible para estado nunca

El sistema DEBE mostrar `Nunca` cuando no exista un timestamp persistido o sea inválido.

#### Escenario: No hay sincronización previa
- DADO que no existe `sync-state.json`
- CUANDO el dashboard renderiza
- ENTONCES la tarjeta de sincronización muestra `Nunca`

#### Escenario: El archivo es inválido
- DADO que el registro de sync es JSON inválido o contiene una fecha inválida
- CUANDO el dashboard renderiza
- ENTONCES la tarjeta de sincronización muestra `Nunca`

### Requisito: Refresco tras sync exitosa

El sistema DEBE revalidar el dashboard tras una sincronización exitosa para mostrar la nueva fecha sin navegación manual.

#### Escenario: La nueva fecha aparece tras sync
- DADO que el usuario ejecuta un sync exitoso
- CUANDO termina la operación
- ENTONCES el dashboard refleja el nuevo timestamp en la vista siguiente
