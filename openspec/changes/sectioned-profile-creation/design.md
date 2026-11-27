# Diseño: Sectioned Profile Creation Form

## Enfoque técnico

Reescribir `CreateProfilePanel` como componente presentacional puro: eliminar el estado local del orquestador y moverlo a `newAssignments["orchestrator"]` del padre. Extraer `SectionBlock` como sub-componente interno. El estado de colapso vive en el propio panel. `handleCopyOrchestratorToSection(phases)` se agrega en `ProfilesClient`, que ya tiene acceso a `newAssignments`.

## Decisiones de arquitectura

| Opción | Tradeoff | Decisión |
|--------|----------|----------|
| Estado local de asignación en panel | Más simple, pero duplica estado con `newAssignments` del padre | ✗ |
| Todo en `newAssignments` del padre | Fuente única de verdad; panel puramente presentacional | ✓ |
| Estado de colapso en panel (local) | No necesita sobrevivir re-renders del padre; coherente con UX | ✓ |
| Acción "copiar" en panel | Necesitaría prop drilling del valor del orquestador | ✗ |
| Acción "copiar" en `ProfilesClient` | Acceso directo a `newAssignments["orchestrator"]` sin drilling | ✓ |
| Collapse con `<button>` + `aria-expanded` | Consistente con el brutalismo actual (no usa `<details>`) | ✓ |

## Flujo de datos

```
ProfilesClient.newAssignments { orchestrator, init, propose, ... }
    │
    ├── onAssignmentChange(key, value) ──→ setNewAssignments(prev => {...})
    │
    └── handleCopyOrchestratorToSection(phases)
            └── copia newAssignments["orchestrator"] → cada phase key

ProfilesClientView
  └── <CreateProfilePanel
        newAssignments={newAssignments}
        onAssignmentChange={onAssignmentChange}
        onCopyToSection={handleCopyOrchestratorToSection}
        onSubmit={name => handleCreate(name)}   ← sin segundo argumento
      />
        └── SECTION_CONFIG.map(section =>
              <SectionBlock
                collapsed={collapsed[section.key]}
                onToggle={() => toggle(section.key)}
                onCopy={() => onCopyToSection(section.phases)}
                ...
              />
                └── section.phases.map(phase =>
                      <PhaseRow phase={phase} ... />
                    )
            )
```

## Cambios de archivos

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/components/organisms/ProfilesClient/createProfilePanel.tsx` | Modificar | Agregar `SectionBlock` + `PhaseRow`; collapse state; props `newAssignments`, `onAssignmentChange`, `onCopyToSection`; eliminar estado local `assignment` |
| `src/components/organisms/ProfilesClient/profilesClient.tsx` | Modificar | Agregar `handleCopyOrchestratorToSection(phases)`; pasar nuevas props a la vista |
| `src/components/organisms/ProfilesClient/profilesClientView.tsx` | Modificar | Reenviar `newAssignments`, `onAssignmentChange`, `onCopyToSection` a `CreateProfilePanel` |
| `src/resources/en.ts` | Modificar | Agregar claves de sección, copy-action y fases |
| `src/resources/es.ts` | Modificar | Mismas claves en español |

## Interfaces / Contratos

```tsx
// Props actualizadas de CreateProfilePanel
interface CreateProfilePanelProps {
  open: boolean;
  pendingAction: string | null;
  catalog: ModelCatalog;
  connectedProviders?: string[];
  newAssignments: Record<string, { provider: string; model: string; variant: string }>;
  onAssignmentChange: (key: string, value: { provider: string; model: string; variant: string }) => void;
  onCopyToSection: (phases: string[]) => void;
  onSubmit: (name: string) => void;   // orchestrator leído desde newAssignments["orchestrator"]
  onCancel: () => void;
}

// Config estática de secciones (colocada en createProfilePanel.tsx)
const SECTION_CONFIG = [
  { key: "orchestrator", phases: ["orchestrator"], copyable: false, alwaysExpanded: true },
  { key: "planning",     phases: ["init", "propose", "explore", "onboard"], copyable: true },
  { key: "design",       phases: ["spec", "design", "tasks", "apply"],       copyable: true },
  { key: "closure",      phases: ["verify", "archive"],                       copyable: true },
] as const;

// Nuevas claves i18n (en + es)
// profiles_section_orchestrator, profiles_section_planning,
// profiles_section_design_execution, profiles_section_closure_support,
// profiles_copy_to_section, profiles_section_optional,
// profiles_phase_init … profiles_phase_onboard  (×10)
```

## Estrategia de pruebas

| Capa | Qué probar | Enfoque |
|------|------------|---------|
| Unit | `normalizeName` — sin cambios | Suite existente pasa sin modificación |
| Unit | Toggle de colapso por sección | RTL: click header → `aria-expanded` cambia, cuerpo oculto/visible |
| Unit | Acción "copiar" invoca `onCopyToSection` con las fases correctas | RTL: stub `onCopyToSection`, verificar llamada |
| Unit | Variante oculta cuando el modelo no tiene variantes | RTL: catálogo sin variantes → no `combobox` variant |
| Unit | Submit deshabilitado hasta que el orquestador esté completo | RTL: orquestador incompleto → botón disabled |
| Integration | `handleCopyOrchestratorToSection` copia valores | Vitest: verifica que `newAssignments[phase]` recibe los valores del orquestador |
| Integration | `handleCreate` genera claves correctas con fases | Caso nuevo en `profilesClient.test.tsx` |

## Threat Matrix

N/A — no existe boundary de routing, shell, subprocess, VCS/PR, clasificación de ejecutables ni integración de procesos.

## Migración / Rollout

No se requiere migración. `CreateProfilePanel` es un componente hoja; revertir solo requiere revertir `createProfilePanel.tsx`. `handleCreate` en el padre no cambia su lógica interna.

## Preguntas abiertas

- [ ] ¿Los tests existentes de `createProfilePanel.test.tsx` que verifican `onSubmit(name, assignment)` se actualizan a `onSubmit(name)` en la fase de tasks, o se deja como primera tarea del apply?
