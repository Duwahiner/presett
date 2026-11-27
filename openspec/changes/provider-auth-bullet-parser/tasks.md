# Tareas: provider-auth-bullet-parser

## Previsión de Carga de Trabajo

| Campo | Valor |
|-------|-------|
| Líneas estimadas de cambio | ~5 |
| Riesgo de presupuesto de 400 líneas | Bajo |
| PRs encadenados recomendados | No |
| División sugerida | Un solo PR |
| Estrategia de entrega | single-pr |
| Estrategia de cadena | N/A |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Unidades de Trabajo Sugeridas

| Unidad | Objetivo | PR Probable | Comando de prueba enfocado | Arnés de ejecución | Límite de rollback |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Parche de regex y prueba | PR 1 | `npm test src/services/__tests__/providerAuthService.test.ts` | CLI local | Revertir commit |

## Fase 1: Verificación de Estado Inicial (RED Tests)

- [x] 1.1 Añadir caso de prueba `ANSI_U2022_OUTPUT` a `src/services/__tests__/providerAuthService.test.ts` que contenga las 5 credenciales.
- [x] 1.2 Verificar que el test falle (el parser actual solo espera `●` y no `•`).

## Fase 2: Implementación

- [x] 2.1 Modificar `src/services/providerAuthService.ts`: Cambiar `trimmed.startsWith("●")` por `/^[•●]/.test(trimmed)`.
- [x] 2.2 Actualizar lógica de extracción de contenido de `substring(1)` a `replace(/^[•●]/, "").trim()` para manejar el bullet correctamente.

## Fase 3: Verificación (GREEN Tests)

- [x] 3.1 Ejecutar `npm test` para asegurar que el nuevo test con `•` pase.
- [x] 3.2 Confirmar que los tests de regresión existentes (`●`) sigan pasando.
- [x] 3.3 Confirmar que los tests de encabezado/pie de página se mantengan intactos.
