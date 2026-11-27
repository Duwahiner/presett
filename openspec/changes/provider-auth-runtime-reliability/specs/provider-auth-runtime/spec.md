# Especificación de provider-auth-runtime

## Propósito

Definir una detección determinista de proveedores autenticados sin ocultar fallos de invocación ni exponer secretos.

## Requisitos

### Requisito: Invocación determinista del CLI en Windows

El sistema DEBE invocar `opencode providers list` con entorno explícito que preserve `HOME`, `USERPROFILE` y `PATH` del proceso padre.

#### Escenario: Windows resuelve el binario con entorno heredado
- DADO un entorno de Windows con credenciales válidas
- CUANDO se ejecuta la detección de providers
- ENTONCES el CLI se invoca de forma determinista
- Y la lista conectada se obtiene sin depender del entorno implícito

#### Escenario: La falta de entorno no rompe la detección
- DADO que una variable del entorno padre no está definida
- CUANDO se ejecuta la detección
- ENTONCES el sistema sigue produciendo un resultado estructurado
- Y no convierte el fallo en silencio

### Requisito: Estado explícito para fallo o lista vacía

El sistema DEBE devolver un estado estructurado que distinga éxito con lista vacía de fallo de invocación.

#### Escenario: Lista vacía real
- DADO que el CLI responde correctamente sin credenciales
- CUANDO la detección finaliza
- ENTONCES el estado indica éxito
- Y `connectedProviders` puede ser `[]`

#### Escenario: Fallo de CLI
- DADO que el CLI no se encuentra o falla
- CUANDO la detección finaliza
- ENTONCES el estado indica fallo
- Y el catálogo sigue disponible

### Requisito: La respuesta no expone secretos

El sistema DEBE sanitizar mensajes de error y NO DEBE incluir rutas absolutas de credenciales, tokens ni secretos en la respuesta.

#### Escenario: Error sanitizado
- DADO un fallo de invocación
- CUANDO el sistema construye la respuesta
- ENTONCES el mensaje es genérico
- Y no revela datos sensibles del entorno
