# Proposal: Connected Provider Marker Visibility

## Intent

El marcador verde (`bg-success`) que indica proveedores conectados solo se renderiza dentro de las opciones del popup de cada selector. Cuando el usuario cierra el selector con un proveedor ya seleccionado, el trigger no muestra ninguna señal visual de conexión activa. El usuario percibe que el marcador "no existe" aunque la lógica ya está implementada. Adicionalmente, el mapeo canónico `"opencode zen" → "opencode"` es incorrecto: el catálogo usa el ID `opencode-zen`, por lo que esa suscripción nunca llega al set de conectados.

## Scope

### In Scope
- Mostrar el punto verde en el área `Select.Value` / trigger cuando el proveedor seleccionado está en `connectedSet` (`ModelPicker` y `OrchestratorPicker`)
- Corregir el mapeo canónico de `opencode zen` de `"opencode"` a `"opencode-zen"` en `normalizeProviderName`
- Prueba integrada real que cubra ambas superficies con selector cerrado

### Out of Scope
- Añadir marcadores de conexión a los selectores de modelo o variante
- Refactorizar la arquitectura de `PickerField` o `OrchestratorPicker`
- Cambios en la API `/models` o en la cadena de `getConnectedProvidersSafe`

## Capabilities

### New Capabilities
- Ninguna

### Modified Capabilities
- `profiles-page`: el trigger del selector de proveedor debe mostrar el marcador verde cuando el valor seleccionado está en `connectedSet`
- `models-page`: ídem para `ModelPicker` / `PickerField`

## Approach

**Trigger con marcador**: Dentro de `Select.Trigger`, reemplazar `<Select.Value placeholder={...} />` por un fragmento que renderice el valor actual junto al punto verde cuando `connectedSet.has(currentValue)`. Requiere leer el valor de estado (`provider` en `ModelPicker`, `value.provider` en `OrchestratorPicker`) y pasarlo al render del trigger.

**Mapeo canónico**: Cambiar línea 94 de `providerAuthService.ts`:
```
"opencode zen": "opencode"  →  "opencode zen": "opencode-zen"
```

**Prueba integrada**: Usar las pruebas existentes de `providerAuthService.test.ts` (unit) y añadir casos de render en los test files de `ModelPicker` y `ProfilesClientView` que monten el componente con `connectedProviders`, seleccionen un proveedor, y afirmen que el trigger contiene el marcador con selector cerrado.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/molecules/ModelPicker/modelPicker.tsx` | Modified | Trigger de proveedor muestra marcador cuando `connectedSet.has(value)` |
| `src/components/organisms/ProfilesClient/profilesClientView.tsx` | Modified | Trigger de `OrchestratorPicker` ídem |
| `src/services/providerAuthService.ts` | Modified | Mapeo `opencode zen` → `opencode-zen` |
| `src/components/molecules/ModelPicker/__tests__/` | Modified | Prueba: marcador visible en trigger cerrado |
| `src/components/organisms/ProfilesClient/__tests__/` | Modified | Prueba: ídem para `OrchestratorPicker` |
| `src/services/__tests__/providerAuthService.test.ts` | Modified | Caso `normalizeProviderName("OpenCode Zen")` → `"opencode-zen"` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `Select.Value` no acepta children arbitrarios (Base UI) | Med | Verificar API; si no acepta, usar un wrapper visible fuera del componente pero dentro del trigger |
| Regresión en OrchestratorPicker si `value.provider` es string vacío | Low | Guard `connectedSet.has(v) && v !== ""` |
| Otros proveedores con nombre compuesto sin mapeo explícito | Low | Fallthroughs usa `replace(/\s+/g, "-")` — correcto por defecto |

## Rollback Plan

Revertir los tres archivos de producción (`modelPicker.tsx`, `profilesClientView.tsx`, `providerAuthService.ts`) a sus versiones anteriores. Los tests revertidos también. Un solo `git revert` sobre el commit del change basta.

## Dependencies

- Ninguna externa. Base UI `Select` ya instalado y en uso.

## Success Criteria

- [ ] Con un proveedor conectado seleccionado y el popup cerrado, el trigger muestra el punto verde `bg-success`
- [ ] `normalizeProviderName("OpenCode Zen")` retorna `"opencode-zen"`
- [ ] `npm test` pasa con ≥ 3 nuevos casos integrados cubriendo las dos superficies y el mapeo
- [ ] Sin regresiones en los escenarios existentes de `selector-integrity-fixes`
