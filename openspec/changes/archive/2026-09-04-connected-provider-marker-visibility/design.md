# Design: Connected Provider Marker Visibility

## Technical Approach

Envolver `<Select.Value>` con un `<span>` hermano que renderiza el punto `bg-success` cuando `connectedSet.has(value)`. La prop `value` ya existe en `PickerField` y en el `OrchestratorPicker` inline. No se toca la estructura interna de Base UI ni el ARIA del root. El mapeo canónico de OpenCode Zen se corrige en una sola línea.

## Architecture Decisions

| Opción | Tradeoff | Decisión |
|---|---|---|
| Span hermano tras `Select.Value` | Preserva ARIA, mínima superficie de cambio | **Elegida** |
| Reemplazar `Select.Value` por render custom | Puede desconectar Base UI internals; medio riesgo ARIA | Rechazada |
| Overlay absoluto sobre el trigger | Frágil ante cambios de layout; difícil de testear | Rechazada |

**Rationale**: `Select.Value` es el nodo que Base UI usa para anunciar el valor actual al árbol ARIA. Envolverlo en un `<span className="flex items-center gap-2 min-w-0">` y agregar el punto como hermano es transparente para Base UI y para los lectores de pantalla (`aria-hidden="true"` en el punto evita duplicación).

## Data Flow

```
connectedProviders[]  →  connectedSet (Set<string>)  →  PickerField.connectedSet
                                                              │
                                                   trigger cerrado: value ∈ connectedSet?
                                                              │
                                                      sí → <span bg-success /> al lado de Select.Value
                                                      no → solo Select.Value (sin cambio)

normalizeProviderName("OpenCode Zen")
  → lowercase → "opencode zen"
  → mappings["opencode zen"] = "opencode-zen"   ← fix aquí
  → entra en connectedSet como "opencode-zen"
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/molecules/ModelPicker/modelPicker.tsx` | Modify | Trigger de `PickerField`: envolver `Select.Value` + punto condicional |
| `src/components/organisms/ProfilesClient/profilesClientView.tsx` | Modify | Trigger de `OrchestratorPicker` (inline, solo proveedor): ídem |
| `src/services/providerAuthService.ts` | Modify | `"opencode zen": "opencode"` → `"opencode-zen"` (línea 94) |
| `src/components/molecules/ModelPicker/__tests__/modelPicker.test.tsx` | Modify | Nuevos casos: marcador visible con selector cerrado |
| `src/components/organisms/ProfilesClient/__tests__/profilesClientView.test.tsx` | Modify | Nuevos casos: marcador visible en `OrchestratorPicker` cerrado |
| `src/services/__tests__/providerAuthService.test.ts` | Modify | Caso `normalizeProviderName("OpenCode Zen")` → `"opencode-zen"` |

## Interfaces / Contracts

`PickerField` no cambia su interfaz. El único cambio visible en el JSX del trigger:

```tsx
// modelPicker.tsx — dentro de PickerField, reemplazar la línea:
//   <Select.Value placeholder={placeholder} />
// por:
<span className="flex items-center gap-2 min-w-0">
  <Select.Value placeholder={placeholder} />
  {value && connectedSet?.has(value) && (
    <span
      aria-hidden="true"
      className="inline-flex size-2 shrink-0 rounded-full bg-success"
      title="Connected"
    />
  )}
</span>
```

```tsx
// profilesClientView.tsx — dentro de OrchestratorPicker, trigger de provider:
//   <Select.Value placeholder={t("modelPicker_provider")} />
// por:
<span className="flex items-center gap-2 min-w-0">
  <Select.Value placeholder={t("modelPicker_provider")} />
  {value.provider && connectedSet.has(value.provider) && (
    <span
      aria-hidden="true"
      className="inline-flex size-2 shrink-0 rounded-full bg-success"
      title="Connected"
    />
  )}
</span>
```

```typescript
// providerAuthService.ts línea 94:
"opencode zen": "opencode-zen",   // era "opencode"
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `normalizeProviderName("OpenCode Zen")` → `"opencode-zen"` | vitest, sin DOM |
| Integration | `PickerField` con selector cerrado: `getByTitle("Connected")` presente | RTL, montar con `connectedProviders=["openai"]`, `initialProvider="openai"` |
| Integration | `OrchestratorPicker` con selector cerrado: mismo assert en trigger | RTL, montar `ProfilesClientView` en modo edición con provider conectado |
| Regresión | Selector cerrado sin proveedor conectado: punto ausente | RTL, assert `queryByTitle("Connected")` → null |

> Las tres superficies (unit + 2 integration) cubren los criterios de éxito de la propuesta con ≥ 3 nuevos casos.

## Threat Matrix

N/A — no hay routing, shell, subprocess, VCS/PR automation, clasificación de ejecutables ni límite de integración de proceso en este change.

## Migration / Rollout

No migration required. Cambio puramente de render; sin migración de datos ni feature flags.

## Open Questions

- Ninguna bloqueante. Base UI `Select.Value` acepta nodos hermanos dentro del trigger sin restricción documentada; el guard `value && connectedSet?.has(value)` cubre string vacío.
