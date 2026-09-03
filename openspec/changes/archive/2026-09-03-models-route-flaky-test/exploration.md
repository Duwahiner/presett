## Exploration: models-route-flaky-test

### Current State
`GET /api/models` carga en paralelo el catálogo fusionado y `getConnectedProvidersSafe()`. El catálogo usa un caché de módulo (`cachedCatalog` e `inFlightCatalogLoad`) y puede leer un fixture mediante `PRESETT_TEST_OPENCODE_MODELS_FILE`; la consulta de proveedores, en cambio, ejecuta el proceso real `opencode providers list` con un timeout de 10 segundos. El test afectado crea directorios temporales y modifica variables globales de `process.env` en `beforeEach`/`afterEach`, pero no simula esa consulta externa. Bajo ejecución paralela, varios archivos de rutas comparten proceso, variables de entorno y estado de módulo, por lo que pueden sobrescribirse directorios o eliminar el fixture mientras una solicitud sigue pendiente. El límite de 5 segundos del runner hace visible principalmente la dependencia del proceso CLI real; el aislamiento del test elimina la carga y la interferencia compartida.

### Affected Areas
- `src/app/api/models/__tests__/route.test.ts` — el caso afectado invoca el CLI real de proveedores y usa estado global de entorno/caché en hooks de prueba.
- `src/app/api/models/route.ts` — `GET` inicia simultáneamente la carga del catálogo y la consulta externa de proveedores.
- `src/services/providerAuthService.ts` — `getConnectedProvidersSafe` ejecuta `opencode providers list`, sin seam de inyección ni fixture propio para pruebas.
- `src/services/modelCatalogService.ts` — mantiene caché mutable por módulo y lee un fixture desde una variable de entorno global.
- `src/app/api/config/__tests__/route.test.ts` y `src/app/api/profiles/__tests__/route.test.ts` — usan los mismos nombres de variables de entorno y pueden interferir cuando Vitest ejecuta archivos en paralelo.
- `vitest.config.ts` — confirma que no existe serialización global de archivos; la configuración predeterminada permite paralelismo.
- `openspec/config.yaml` — OpenSpec está configurado con Vitest; por tanto, la persistencia híbrida es compatible.

### Approaches
1. **Aislar la dependencia externa en el test de la ruta** — simular `getConnectedProvidersSafe` con un resultado controlado y conservar el fixture de catálogo para probar la fusión.
   - Pros: elimina el proceso CLI, el timeout y la dependencia del entorno del desarrollador; cambio mínimo; permite añadir una aserción independiente sobre `connectedProviders`.
   - Cons: no cubre el proceso real en esta prueba de integración de ruta; requiere mantener el mock alineado con el contrato del servicio.
   - Effort: Low

2. **Introducir dependencias inyectables y contexto de prueba por solicitud** — pasar proveedor de autenticación y rutas/estado explícitos, evitando `process.env` y caché global durante las pruebas.
   - Pros: diseño más robusto y pruebas completamente aisladas; reduce interferencias entre todos los archivos de rutas.
   - Cons: mayor superficie de cambios y riesgo innecesario para corregir el timeout observado; exige revisar varias rutas y consumidores.
   - Effort: High

3. **Desactivar el paralelismo de Vitest para estos archivos o para toda la suite** — serializar la ejecución como mitigación operacional.
   - Pros: muy poca modificación de código.
   - Cons: oculta el acoplamiento global, ralentiza toda la suite y no evita que el CLI real supere 5 segundos; es una red de seguridad, no una causa corregida.
   - Effort: Low

### Recommendation
Elegir el aislamiento de la dependencia externa (opción 1) y añadir regresiones enfocadas. Mockear `getConnectedProvidersSafe` antes de importar la ruta, devolver proveedores deterministas y verificar que la respuesta conserva `providers`, `catalog` y `connectedProviders`; añadir también un caso que confirme que un fallo del servicio de proveedores no impide devolver el catálogo. Mantener `clearServerModelCatalogCache()` y el cleanup actual. Como protección contra la interferencia global entre archivos, ejecutar la prueba afectada junto con los archivos de rutas que comparten variables de entorno en una corrida paralela repetida; si reproduce colisiones, el siguiente cambio mínimo debe encapsular/restaurar las variables con utilidades de Vitest o serializar únicamente ese grupo, no toda la suite.

### Risks
- Un mock demasiado amplio puede dejar sin cobertura el mapeo de nombres de proveedores; conservar esa cobertura en `providerAuthService.test.ts` y probar el contrato de la ruta por separado.
- El caché de módulo puede devolver datos de otro caso si se omite la limpieza o si se añade una llamada concurrente sin esperar su finalización.
- `process.env` sigue siendo estado global entre archivos; simular el CLI corrige el timeout, pero no por sí solo todas las colisiones de fixtures.
- Cambiar la implementación productiva para hacer inyección de dependencias sería desproporcionado sin una reproducción que demuestre una carrera interna del catálogo.

### Ready for Proposal
Yes — proponer un cambio acotado a pruebas: eliminar la ejecución real de `opencode providers list` en la suite de `/api/models`, cubrir éxito y fallo del proveedor conectado, preservar una prueba unitaria del parser/normalizador, y validar repetidamente la suite completa en paralelo. Si la corrida repetida evidencia colisiones de `process.env`, incluir aislamiento o serialización únicamente del conjunto de rutas que comparte esas variables.
