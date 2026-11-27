# Delta para models-page

## ADDED Requirements

### Requisito: La página distingue fallo de detección y lista vacía

El sistema DEBE consumir `providerAuthStatus` para diferenciar un fallo de detección de una lista vacía real de proveedores conectados.

#### Escenario: Fallo visible sin perder catálogo
- DADO que la API devuelve `providerAuthStatus.ok = false`
- CUANDO el usuario abre `/models`
- ENTONCES la página mantiene disponible el catálogo
- Y no interpreta el fallo como ausencia real de credenciales

#### Escenario: Lista vacía legítima
- DADO que la API devuelve `providerAuthStatus.ok = true` y `connectedProviders = []`
- CUANDO el usuario abre `/models`
- ENTONCES la página trata el resultado como ausencia real de conexiones
- Y el catálogo sigue renderizándose normalmente
