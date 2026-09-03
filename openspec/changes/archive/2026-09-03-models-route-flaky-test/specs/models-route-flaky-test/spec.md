# Especificación de models-route-flaky-test

## Propósito

Esta especificación define un cambio únicamente en pruebas para estabilizar `GET /api/models` sin modificar comportamiento de producto.

## Requisitos

### Requisito: Aislamiento determinista de la ruta de modelos

La suite de `src/app/api/models/__tests__/route.test.ts` DEBE sustituir `getConnectedProvidersSafe` por un doble determinista antes de importar la ruta.

#### Escenario: La respuesta conserva el contrato
- DADO un fixture de catálogo válido
- CUANDO la prueba ejecuta `GET /api/models`
- ENTONCES la respuesta incluye `providers`, `catalog` y `connectedProviders`
- Y el catálogo proviene del fixture controlado

#### Escenario: El fallo del proveedor no bloquea el catálogo
- DADO que el doble de `getConnectedProvidersSafe` falla o rechaza
- CUANDO la prueba ejecuta `GET /api/models`
- ENTONCES la respuesta sigue devolviendo el catálogo
- Y el caso de fallo queda cubierto sin invocar el CLI real

### Requisito: No invocar CLI real en la suite afectada

La suite de la ruta DEBE ejecutarse sin llamar a `opencode providers list` ni a otro proceso externo real.

#### Escenario: La ejecución usa solamente fixtures
- DADO el test de la ruta con mocks activos
- CUANDO la suite corre de forma aislada o en paralelo
- ENTONCES no se ejecuta ningún proceso CLI real
- Y el resultado depende solo de fixtures y dobles

### Requisito: Estabilidad bajo paralelismo repetido

La validación DEBE repetirse en paralelo al menos cinco veces y mantener estabilidad de entorno y caché por archivo.

#### Escenario: Corridas paralelas repetidas no fallan
- DADO la suite completa ejecutándose en paralelo
- CUANDO se repite al menos cinco veces
- ENTONCES no aparecen fallos por colisiones de `process.env`
- Y no se introduce serialización global de Vitest

#### Escenario: Si aparece colisión, el alcance sigue siendo acotado
- DADO una colisión reproducida entre archivos de ruta
- CUANDO se aplica la mitigación de prueba
- ENTONCES solo se aísla o serializa el grupo afectado
- Y la suite completa mantiene paralelismo fuera de ese grupo

### Requisito: Cobertura separada del parser de proveedores

La cobertura de `src/services/providerAuthService.test.ts` DEBE conservar el parser y normalizador del contrato de proveedores.

#### Escenario: El parser sigue cubierto por su propia prueba
- DADO el contrato de proveedores existente
- CUANDO se ejecuta la suite de servicios
- ENTONCES el parser/normalizador continúa verificado por su prueba unitaria
- Y la prueba de ruta no reemplaza esa cobertura
