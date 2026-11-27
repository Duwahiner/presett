# Propuesta: Selector Integrity Fixes

## Intent

Cuatro defectos de integridad confirmados degradan la fiabilidad de la UI de perfiles/modelos:
1. Los selectores muestran listas en orden de entrada (no determinista), lo que confunde al usuario cuando el catálogo cambia de orden.
2. El marcador visual de proveedor con suscripción activa (`bg-success`) puede perderse en variantes del componente o no tener cobertura de regresión.
3. El selector Variantes es obligatorio incluso cuando el modelo no tiene variantes, bloqueando la creación y edición legítimas.
4. El panel de creación de perfiles solo hace `trim()` al nombre, por lo que nombres con mayúsculas o caracteres inválidos llegan sin sanitizar al adapter y producen HTTP 400 (SCHEMA_INVALID).

## Scope

### In Scope
- Ordenar localmente todos los arrays de selectores: providers, models, variants y lista de perfiles en `ModelsClientView`.
- Garantizar el span `bg-success` en `ModelPicker` y cubrir su presencia/ausencia con al menos un test de regresión.
- Hacer el selector Variantes opcional cuando el modelo no tiene variantes; aceptar `provider + model` sin `variant` y omitir la propiedad `variant` al persistir si está vacía; rechazar variantes desconocidas.
- Normalizar el nombre del perfil antes del POST (`toLower`, strip de caracteres inválidos) en el boundary UI/cliente y agregar test de regresión para el caso de nombre con mayúsculas.

### Out of Scope
- Cambiar la validación del adapter (`/^[a-z0-9_-]+$/`).
- Rediseñar los selectores ni alterar su look & feel.
- Soporte de variantes custom fuera del catálogo.
- Modificar la lógica del catálogo/API de modelos.

## Capabilities

### New Capabilities
<!-- Ninguna -->
None

### Modified Capabilities
- `profiles-page`: ordenamiento determinista en `CreateProfilePanel` y `ProfilesClientView`; normalización de nombre antes del POST; variant opcional en creación y edición.
- `models-page`: ordenamiento determinista en `ModelsClientView`; marcador `bg-success` de proveedor conectado garantizado con cobertura de regresión.
- `profile-detail-endpoint`: contrato de payload actualizado — `variant` es opcional; se omite al persistir si está vacío; variantes desconocidas siguen siendo rechazadas.

## Approach

**Selectores ordenados** — en cada componente/hook que mapea el catálogo a listas, aplicar `.sort()` local antes del render. No tocar catálogo ni API.

**Marcador de suscripción** — verificar el span condicional `bg-success` en `ModelPicker`; si falta en variantes de renderizado, restaurar el transporte `connectedProviders` y el span. Agregar test con mock de `connectedProviders` no vacío.

**Variant opcional** — en `isValid`/`isAssigned`/`hasValidOrchestrator` y en el handler de submit: si `variants.length === 0` el campo es opcional; al construir el payload omitir `variant` cuando sea `""`. En `validateModelAssignment` del adapter: aceptar ausencia de `variant` cuando el catálogo no tiene variantes para ese modelo.

**Normalización del nombre** — en `profilesClient.handleCreate` (o en `createProfilePanel` en el evento del formulario) sanitizar el nombre: `.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")`. Agregar test unitario en el servicio o componente que capture el caso de nombre con mayúsculas.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/molecules/ModelPicker/modelPicker.tsx` | Modified | Ordenar providers/models/variants; asegurar span `bg-success` |
| `src/components/organisms/ProfilesClient/createProfilePanel.tsx` | Modified | Ordenar variantes; normalizar nombre antes del submit |
| `src/components/organisms/ProfilesClient/profilesClientView.tsx` | Modified | Ordenar perfiles en select; variant opcional en edición |
| `src/components/organisms/ModelsClient/modelsClientView.tsx` | Modified | Ordenar selector de perfiles |
| `src/components/organisms/ProfilesClient/profilesClient.tsx` | Modified | Normalizar nombre en `handleCreate`; omitir variant vacío en payload |
| `src/lib/validators.ts` | Modified | `isValid`/`isAssigned`: variant opcional cuando modelo sin variantes |
| `src/adapters/opencode.ts` | Modified | `validateModelAssignment`: aceptar ausencia de variant si catálogo sin variantes |
| `src/services/profilesApiService.ts` | No change | Sigue siendo forwarding |
| Tests: ModelPicker, ProfilesClient, validators, adapter | Modified | Agregar casos de regresión para cada fix |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| El sort de providers rompe el item seleccionado actual | Low | Mantener valor seleccionado por ID, no por índice |
| Omitir `variant` en payload rompe perfiles existentes con variante | Low | Solo omitir cuando `variant === ""`; variantes no vacías se conservan |
| Normalización de nombre cambia nombre esperado por usuario | Med | Mostrar el nombre normalizado en el formulario antes de enviar (feedback visual) |
| `validateModelAssignment` más permisivo acepta combos inválidos | Low | La condición es estricta: solo cuando `variants.length === 0` en el catálogo |

## Rollback Plan

Todos los cambios son aditivos o de narrowing en el boundary UI. Si algún fix produce regresión:
1. Revertir el archivo afectado (`git revert` del commit atómico correspondiente).
2. Los otros fixes son independientes y no se ven afectados.
3. El adapter sigue rechazando payloads inválidos; el rollback de normalización solo restaura el 400 original.

## Dependencies

- Catálogo de modelos debe seguir retornando `variants: []` para modelos sin variantes (comportamiento existente confirmado).

## Success Criteria

- [ ] Todos los selectores muestran listas en orden alfabético determinista, independientemente del orden del catálogo.
- [ ] El span `bg-success` aparece en `ModelPicker` cuando `connectedProviders` contiene el provider; test de regresión pasa.
- [ ] Un perfil con modelo sin variantes se puede crear y editar sin que el selector Variantes sea obligatorio.
- [ ] `POST /api/profiles` con nombre en mayúsculas no devuelve 400; test de regresión documenta el caso.
- [ ] Variante desconocida sigue siendo rechazada.
- [ ] `npm test` pasa sin regresiones.
