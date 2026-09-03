# Delta para sync-state-persistence

## REQUISITOS AÑADIDOS

### Requisito: Persistencia dedicada de última sincronización

El sistema DEBE guardar `lastSuccessfulSyncAt` en un registro dedicado bajo `~/.presett/sync-state.json`.

#### Escenario: Se guarda una sincronización exitosa
- DADO que `gentle-ai sync` termina con `exitCode = 0`
- CUANDO el endpoint de sync persiste el estado
- ENTONCES el archivo existe o se crea
- Y contiene un timestamp ISO 8601 en `lastSuccessfulSyncAt`

#### Escenario: Una sincronización fallida no actualiza el estado
- DADO que `gentle-ai sync` termina con `exitCode != 0`
- CUANDO se procesa la respuesta
- ENTONCES no se escribe ni se modifica `sync-state.json`

### Requisito: Escritura atómica y validación tolerante

El sistema DEBE escribir el registro de forma atómica y DEBE tolerar archivo ausente, JSON inválido o timestamp inválido al leer.

#### Escenario: La escritura evita truncados
- DADO que se intenta persistir un nuevo timestamp
- CUANDO la escritura se completa
- ENTONCES el contenido visible final es completo y válido

#### Escenario: Lectura inválida no bloquea el flujo
- DADO que `sync-state.json` no existe o contiene datos inválidos
- CUANDO el servicio lo lee
- ENTONCES devuelve ausencia de valor sin fallar

### Requisito: Advertencia no bloqueante ante fallo de persistencia

El sistema DEBE conservar el éxito funcional de `gentle-ai sync` aunque falle la persistencia del timestamp y DEBE devolver una advertencia visible.

#### Escenario: Sync exitoso con fallo de persistencia
- DADO que `gentle-ai sync` termina con éxito
- Y la escritura del estado falla
- CUANDO el endpoint responde
- ENTONCES la respuesta conserva éxito HTTP
- Y expone una advertencia de persistencia
