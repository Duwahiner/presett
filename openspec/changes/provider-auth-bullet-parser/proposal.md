# Propuesta: provider-auth-bullet-parser

## Intent

El CLI imprime `•` (U+2022) pero `parseConnectedProviders` solo acepta `●` (U+25CF). Resultado: `ok: true` con `connectedProviders: []` aunque hay cinco credenciales. El fix corrige el parser, agrega test contra salida ANSI real y restaura los cinco IDs normalizados.

## Scope

### In Scope
- Aceptar U+2022 `•` y U+25CF `●` como marcadores válidos de ítem en el parser
- Agregar test que usa salida ANSI real del CLI (no mock de texto plano)
- Verificar que los cinco IDs conocidos se normalizan correctamente
- Actualizar spec delta de `provider-auth-runtime`

### Out of Scope
- Cambios en la invocación del CLI (`exec`, env, cwd)
- Cambios en la ruta GET `/api/models`
- Otros formatos de salida del CLI no verificados

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `provider-auth-runtime`: el requisito de parsing debe aceptar ambos caracteres bullet y testear contra salida ANSI real

## Approach

En `parseConnectedProviders`, reemplazar la regex o condición que solo acepta `●` (U+25CF) por una que acepte `[•●]` (U+2022 | U+25CF). Agregar fixture de salida real con secuencias ANSI y cinco providers; el test debe confirmar que todos los IDs se extraen. Sin cambio de interfaz pública.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/lib/providers.ts` (o path donde vive el parser) | Modified | Regex bullet aceptar U+2022 |
| `src/lib/__tests__/providers.test.ts` | Modified | Test con fixture ANSI real y cinco IDs |
| `openspec/changes/provider-auth-bullet-parser/specs/provider-auth-runtime/spec.md` | New delta | Requisito bullet dual y scenario ANSI |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Fixture ANSI varía entre versiones del CLI | Low | Fijar fixture como string literal capturado hoy |
| Regex demasiado permisiva captura líneas de encabezado | Low | Anclar patrón al inicio de línea con `^` |

## Rollback Plan

Revertir el commit que modifica el parser. El cambio es quirúrgico (una línea de regex); el rollback no afecta otros módulos.

## Dependencies

- Ninguna dependencia externa nueva

## Success Criteria

- [ ] `parseConnectedProviders` retorna los cinco IDs conocidos con salida ANSI real que usa `•`
- [ ] `parseConnectedProviders` sigue funcionando con salida que usa `●`
- [ ] Suite completa pasa (`npm test` exit 0)
- [ ] `connectedProviders` en `/api/models` deja de devolver `[]` con credenciales presentes
