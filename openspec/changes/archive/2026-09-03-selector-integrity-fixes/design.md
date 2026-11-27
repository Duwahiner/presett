# Design: Selector Integrity Fixes

## Technical Approach

Cuatro correcciones de boundary localizadas en UI y validación: (1) sort inmutable de arrays del catálogo antes del render, (2) normalización de nombre en el boundary del formulario, (3) contrato de variante opcional propagado en tres capas (UI/validator/adapter), (4) marcador `bg-success` garantizado en todas las superficies de picker de proveedor.

No se tocan la API del catálogo, el adapter de validación del esquema `/^[a-z0-9_-]+$/` ni el look & feel de los selectores.

## Architecture Decisions

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Normalizar en `createProfilePanel.handleSubmit` | Más cercano al boundary; permite feedback inmediato antes del POST | **Elegida** |
| Normalizar en `profilesClient.handleCreate` | Más profundo; name ya salió del formulario sin sanitizar | Rechazada |
| `[...arr].sort()` para variantes | Crea copia; `Object.keys()` ya devuelve array nuevo pero `catalog[p]?.[m]` es referencia directa | **Obligatorio** — mutar la ref corrompe renders posteriores |
| `ModelAssignmentInput.variant?: string` (campo opcional) | Un solo path de validación; TypeScript expresa el contrato sin duplicar la función | **Elegida** |
| Nueva función `validateModelAssignmentOptionalVariant` | Duplica lógica; dos firmas a mantener | Rechazada |
| Pasar `connectedProviders` a `OrchestratorPicker` | Minimal — mismo patrón que `PickerField`; evita refactor de layout | **Elegida** |
| Reusar `ModelPicker` dentro de `OrchestratorPicker` | `OrchestratorPicker` oculta el botón y tiene layout propio; refactor invasivo | Rechazada |

## Data Flow

### Normalización de nombre

```
<Input> onChange (raw display)
    │
    ▼
handleSubmit
    │ .trim().toLowerCase().replace(/[^a-z0-9_-]/g, "")
    │ guard: normalizado vacío → block (canSubmit = false)
    ▼
onSubmit(normalizedName, assignment)
    │
    ▼
profilesClient.handleCreate ──→ POST /api/profiles ──→ adapter /^[a-z0-9_-]+$/
```

### Variante opcional (tres capas)

```
UI (isAssigned / disabled)        validateModelAssignment         adapter config write
variants.length === 0 ?           variants.length === 0 ?         assignment.variant === "" ?
  variant no requerida              skip variants.includes()         omitir clave "variant"
  select deshabilitado (auto)       → ok(undefined)                  → persiste sin variant
```

### Sort inmutable

```
catalog (referencia del cache)
    │
    ├─ Object.keys(catalog).sort()           ← nuevo array ✓
    ├─ Object.keys(catalog[p] ?? {}).sort()  ← nuevo array ✓
    └─ [...(catalog[p]?.[m] ?? [])].sort()   ← spread obligatorio (ref directa)
```

## File Changes

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/components/molecules/ModelPicker/modelPicker.tsx` | Modificar | `variants`: `[...arr].sort()`; `isValid` y `onConfirm` variant-opcional; `onConfirm` omite `variant` cuando `""` |
| `src/components/organisms/ProfilesClient/createProfilePanel.tsx` | Modificar | Sort providers/models; `isAssigned` variant-opcional; `handleSubmit` normaliza nombre; guard nombre vacío post-strip |
| `src/components/organisms/ProfilesClient/profilesClientView.tsx` | Modificar | `OrchestratorPicker`: sort providers/models/variants; prop `connectedProviders?`, `connectedSet`, span `bg-success` en provider items; `isAssigned` variant-opcional |
| `src/lib/validators.ts` | Modificar | `ModelAssignmentInput.variant?: string`; `validateModelAssignment` branch: `if variants.length === 0 && !input.variant → ok` |
| `src/adapters/opencode.ts` | Modificar | `createProfile`/`updateProfile`: omitir clave `variant` cuando `assignment.variant === ""`; actualizar tipo de assignments a `variant?: string` |
| `src/components/molecules/ModelPicker/__tests__/modelPicker.test.tsx` | Modificar | Test: `bg-success` presente cuando `connectedProviders` no vacío; test: modelo sin variantes habilita Confirm |
| `src/lib/__tests__/validators.test.ts` | Modificar | Test: `variant` ausente + `variants: []` → ok; `variant` ausente + `variants` no vacío → SCHEMA_INVALID |
| `src/components/organisms/ProfilesClient/__tests__/createProfilePanel.test.tsx` | Crear | Test: nombre con mayúsculas → normalizado; nombre solo chars inválidos → submit bloqueado |

## Interfaces / Contracts

```typescript
// validators.ts — variant opcional
export interface ModelAssignmentInput {
  provider: string;
  model: string;
  variant?: string;  // undefined cuando modelo sin variantes
}

// createProfilePanel — normalización
function normalizeName(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}
// Uso: canSubmit incluye normalizeName(name).length > 0

// adapters/opencode.ts — omitir variant vacío
config.agent[agentKey] = {
  ...(config.agent[agentKey] ?? {}),
  model: joinModelRef(assignment.provider, assignment.model),
  ...(assignment.variant ? { variant: assignment.variant } : {}),
};
```

## Testing Strategy

| Layer | Qué testear | Cómo |
|-------|-------------|------|
| Unit (validators) | variant opcional: `[]` + sin variant → ok; `[]` + variant provisto → ok; variantes presentes + variant ausente → SCHEMA_INVALID | `validators.test.ts` |
| Unit (normalizeName) | `"MyProfile"` → `"myprofile"`; `"My Profile!"` → `"my-profile"` o `"myprofile"`; `"!!!"` → `""` bloqueado | `createProfilePanel.test.tsx` |
| Component (ModelPicker) | `bg-success` aparece para provider en `connectedProviders`; ausente para no-conectado; confirm habilitado sin variant cuando variants vacío | `modelPicker.test.tsx` |
| Integration (adapter) | `createProfile` con `variant: ""` → config no escribe clave variant; con variant válido → escribe | `adapters/__tests__/` |

## Threat Matrix

| # | Amenaza | Aplicable | Comportamiento esperado | RED test |
|---|---------|-----------|------------------------|----------|
| T1 | Nombre normalizado colapsa a string vacío | **Aplicable** | UI bloquea submit; no se emite POST | `normalizeName("!!!") === ""` → `canSubmit` false |
| T2 | Colisión post-normalización (dos nombres → misma clave) | **Aplicable** | API devuelve SCHEMA_INVALID ("Profile already exists"); UI muestra error | POST con nombre existente → 400 |
| T3 | XSS vía nombre en DOM | **Aplicable** | Post-normalización solo `[a-z0-9_-]`; sin contenido ejecutable posible | `normalizeName("<script>") === ""` |
| T4 | Variant vacío persistido en config | **Aplicable** | Adapter omite clave `variant`; config no escribe `variant: ""` | test adapter: `variant: ""` → ausencia de clave en JSON escrito |
| Shell injection | N/A — normalization path no invoca shell ni subprocess | — | — |
| Path traversal | N/A — nombre usado como profile key, no como path de filesystem directamente (adapter valida por separado) | — | — |

## Migration / Rollout

Sin migración de datos. Los perfiles existentes con `variant` válida no se ven afectados. Si el adapter ya tiene `variant: ""` en un perfil edge (caso improbable), la omisión solo ocurre en escrituras nuevas; lecturas no se tocan.

Rollback: cada fix es un commit atómico independiente — revertir uno no afecta los demás.

## Open Questions

- [ ] ¿`normalizeName` debe mostrar el valor normalizado en tiempo real en el input (controlled display) o solo en el momento del submit? La propuesta sugiere feedback visual antes de enviar — se recomienda mostrar el resultado normalizado debajo del campo antes de confirmar.
- [ ] ¿`OrchestratorPicker` debe recibir `connectedProviders` desde `ProfilesClient` o desde la API de modelos? Depende de si `connectedProviders` ya se pasa al contexto de perfiles — verificar al implementar.
