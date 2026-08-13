# Tareas: Diagnósticos y actualizaciones automáticas de Gentle-AI

## Forecast de carga de revisión

| Campo | Valor |
|---|---|
| Líneas cambiadas estimadas | 650-900 |
| Riesgo de presupuesto de 400 líneas | Alto |
| PRs encadenados recomendados | Sí |
| División sugerida | Slice 1 -> Slice 2 -> Slice 3 |
| Estrategia de entrega | ask-on-risk |
| Estrategia de cadena | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Unidades de trabajo sugeridas

| Unidad | Objetivo | PR probable | Prueba enfocada | Harness | Límite de reversión |
|---|---|---|---|---|---|
| 1 | Contrato local y diagnóstico seguro | Slice 1 | `npm test -- diagnostics` | Solicitud a `/api/diagnostics` simulada | Rutas, tipos y servicios locales |
| 2 | Releases, frecuencia y aviso | Slice 2 | `npm test -- diagnostics` | Temporizador y doble de GitHub | Estado PreSett, check y UI de aviso |
| 3 | Actualización y experiencia final | Slice 3 | `npm test -- diagnostics` | Proceso oficial simulado | Ruta update, pantalla y navegación |

## Fase 1: Contrato y diagnóstico

- [x] 1.1 RED: definir pruebas de versión CLI, rutas solo como estados y errores saneados en `src/services/__tests__/diagnosticsService.test.ts`.
- [x] 1.2 Crear `src/services/diagnosticsService.ts` y extender `processService.ts`, `stateService.ts` y `paths.ts` con contratos fijos.
- [x] 1.3 RED/GREEN: crear y probar `src/app/api/diagnostics/route.ts` con resultados parciales, sin alterar `/api/status` ni `/api/health`.

## Fase 2: Releases y aviso

- [x] 2.1 RED: probar comparación stable/RC, frecuencia, concurrencia, timeout y persistencia en `src/services/__tests__/diagnosticsService.test.ts`.
- [x] 2.2 Implementar estado propio de PreSett, cliente de Releases acotado y `src/app/api/diagnostics/check/route.ts`.
- [x] 2.3 RED/GREEN: crear componente de aviso persistente y programador activo; verificar botón manual y accesibilidad.

## Fase 3: Actualización y pantalla

- [ ] 3.1 RED: probar que `src/app/api/diagnostics/update/route.ts` solo invoca el comando oficial, aplica timeout y conserva el aviso ante fallo. **No aplicado en slice 3 por alcance explícito: sin instalación/actualización ejecutada desde PreSett.**
- [ ] 3.2 Implementar actualización controlada y verificación de versión posterior antes de limpiar el aviso. **No aplicado en slice 3 por alcance explícito: sin instalación/actualización ejecutada desde PreSett.**
- [x] 3.3 Crear `src/app/diagnostics/`, agregar navegación en `DashboardLayout`, recursos tipados en `src/resources/` y pruebas de integración de UI.

## Fase 4: Verificación

- [ ] 4.1 Ejecutar la suite Vitest enfocada y completa; cubrir los escenarios de la especificación en Windows y un entorno Unix si está disponible.
- [ ] 4.2 Verificar manualmente que no se muestran rutas, permisos detallados, argumentos ni salida de procesos.
