# Proposal: Base Profile Switch Route

## Intent

El perfil Base tiene `name: ""`. Al llamar `switchProfile("")`, el servicio cliente
construye `POST /api/profiles/${encodeURIComponent("")}/switch` → segmento vacío →
Next.js colapsa la ruta a `/api/profiles/switch`, que no existe → **405 Method Not Allowed**.

Los perfiles nombrados no se ven afectados. `getProfileDetail` y `updateProfile` ya
resuelven este patrón con el segmento literal `"base"` cuando `name === ""`; este cambio
aplica la misma convención a `switchProfile`.

## Scope

### In Scope
- Nueva ruta API `POST /api/profiles/base/switch` que delega al adapter existente con `name = ""`
- Alias cliente en `profilesApiService.switchProfile`: segmento `"base"` cuando `name === ""`
- Tests unitarios para la nueva ruta y el alias de servicio

### Out of Scope
- Cambios al adapter `opencode.switchProfile` (ya soporta `name = ""` correctamente)
- Modificaciones a perfiles nombrados o cualquier otra operación de perfil
- Refactors de seguridad o de rutas dinámicas existentes

## Capabilities

### New Capabilities
- `base-profile-switch`: Ruta reservada `POST /api/profiles/base/switch` para activar el perfil Base

### Modified Capabilities
- `profile-operations`: `switchProfile` en `profilesApiService` añade alias `"base"` para `name === ""`

## Approach

1. **Nueva ruta** `src/app/api/profiles/base/switch/route.ts` — copia estructural de
   `[name]/switch/route.ts` sin `params`; llama `switchProfile(configDir(), "", backupDir())`.
2. **Alias cliente** en `profilesApiService.switchProfile`:
   ```ts
   const segment = name === "" ? "base" : encodeURIComponent(name);
   return post(`/profiles/${segment}/switch`);
   ```
   Patrón idéntico al que ya usan `getProfileDetail` y `updateProfile`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/api/profiles/base/switch/route.ts` | New | Ruta reservada POST para Base |
| `src/app/api/profiles/base/switch/__tests__/route.test.ts` | New | Tests de la nueva ruta |
| `src/services/profilesApiService.ts` | Modified | Alias `"base"` en `switchProfile` |
| `src/services/__tests__/profilesApiService.test.ts` | Modified | Test del alias |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Conflicto con ruta dinámica `[name]` para `name="base"` | Low | Next.js prioriza rutas estáticas sobre dinámicas |
| Regresión en perfiles nombrados | Low | La lógica de alias solo actúa cuando `name === ""` |

## Rollback Plan

Revertir `profilesApiService.switchProfile` al `encodeURIComponent(name)` original y
eliminar `src/app/api/profiles/base/switch/`. Los perfiles nombrados quedan sin cambio.

## Dependencies

- Ninguna dependencia externa. El adapter `opencode.switchProfile` ya acepta `name = ""`.

## Success Criteria

- [ ] `POST /api/profiles/base/switch` responde `{ ok: true }` cuando el perfil Base se activa
- [ ] `POST /api/profiles/[nombre]/switch` sigue funcionando sin cambios para perfiles nombrados
- [ ] `switchProfile("")` en el cliente ya no genera un 405
- [ ] Tests de la nueva ruta y del alias pasan en CI
