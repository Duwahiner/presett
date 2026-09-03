# Propuesta: models-route-flaky-test

## Intención

El test de `GET /api/models` falla de forma intermitente porque ejecuta el proceso real `opencode providers list` dentro de la suite de Vitest. Bajo paralelismo, el timeout de 5 s del runner se supera; el test aislado pasa. El objetivo es volver el test determinista simulando la dependencia externa sin tocar código productivo.

## Alcance

### Dentro del alcance
- Simular `getConnectedProvidersSafe` en `route.test.ts` con resultado controlado
- Añadir caso: fallo del proveedor no bloquea la devolución del catálogo
- Preservar cobertura del parser/normalizador en `providerAuthService.test.ts`
- Ejecutar la suite repetidamente en paralelo para detectar colisiones de `process.env`
- Si se reproducen colisiones: aislar/restaurar variables por archivo o serializar únicamente el grupo de rutas afectadas

### Fuera del alcance
- Inyección de dependencias en código productivo
- Serialización global de toda la suite de Vitest
- Cambios en `route.ts`, `providerAuthService.ts` o `modelCatalogService.ts` sin prueba adicional que lo justifique

## Capacidades

> Contrato entre propuesta y fase spec.

### Capacidades nuevas
- Ninguna

### Capacidades modificadas
- Ninguna — el cambio es exclusivamente en archivos de prueba; no hay contrato de producto que varíe.

## Enfoque

Usar `vi.mock` (o `vi.spyOn`) para sustituir `getConnectedProvidersSafe` antes de importar la ruta. Devolver proveedores deterministas en el caso de éxito y rechazar/lanzar en el caso de fallo. Mantener `clearServerModelCatalogCache()` y el fixture de catálogo. Después de estabilizar el mock, ejecutar `vitest run --reporter=verbose` al menos cinco veces en paralelo para validar que no quedan colisiones de `process.env`.

## Áreas afectadas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `src/app/api/models/__tests__/route.test.ts` | Modificado | Mock de `getConnectedProvidersSafe`; casos éxito y fallo |
| `src/services/providerAuthService.ts` | Solo lectura | Se lee para mantener el contrato del mock alineado |
| `vitest.config.ts` | Solo lectura | Se verifica configuración de paralelismo existente |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Mock demasiado amplio deja sin cobertura el mapeo de proveedores | Media | Preservar prueba unitaria del parser en `providerAuthService.test.ts` |
| Caché de módulo devuelve datos de otro caso si se omite limpieza | Baja | `clearServerModelCatalogCache()` en `afterEach` ya existente; verificar |
| Colisiones de `process.env` persisten tras mock del CLI | Baja-Media | Corrida paralela repetida; si se reproduce, encapsular con `vi.stubEnv` |

## Plan de reversión

Revertir `route.test.ts` al estado anterior en git (`git checkout HEAD -- src/app/api/models/__tests__/route.test.ts`). No hay cambios productivos que deshacer.

## Dependencias

- Ninguna externa; Vitest y el fixture de catálogo ya están presentes.

## Criterios de éxito

- [ ] `vitest run src/app/api/models` completa 100 % en cinco ejecuciones consecutivas sin timeout
- [ ] La suite completa en paralelo no regresa fallos de `providerAuth` ni de `models`
- [ ] La cobertura de `providerAuthService` no disminuye respecto al baseline actual
