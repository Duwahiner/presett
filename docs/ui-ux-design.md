# PreSett - Diseño UI/UX

**Versión:** 0.1.0  
**Fecha:** 2026-08-02  
**Estado:** Draft

---

## 1. Principios de Diseño

### 1.1 Filosofía

- **Claridad sobre complejidad:** Mostrar solo lo necesario
- **Seguridad primero:** Confirmar cambios destructivos
- **Feedback inmediato:** Validar en tiempo real
- **Consistencia:** Mismos patrones en toda la app

### 1.2 Estilo Visual

- **Tema:** Dark mode (por defecto) + Light mode
- **Paleta:** Basada en Gentle-AI (rosas/neón)
- **Tipografía:** Inter o similar
- **Espaciado:** Generoso, respirable

---

## 2. Estructura de Navegación

### 2.1 Layout Principal

```
┌─────────────────────────────────────────────────────────┐
│  Header                                                  │
│  [Logo PreSett]  [Dashboard] [Agents] [Models] [Backups]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Sidebar (opcional)         │  Main Content              │
│  - Agentes detectados       │                            │
│  - Estado de config         │  (contenido dinámico)      │
│  - Último sync              │                            │
│                             │                            │
├─────────────────────────────────────────────────────────┤
│  Footer: [Status] [Sync Button] [Settings]              │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Páginas Principales

1. **Dashboard** - Vista general del estado
2. **Agents** - Gestión de agentes instalados
3. **Models** - Asignación de modelos
4. **Profiles** - Perfiles SDD (OpenCode)
5. **Backups** - Gestión de backups
6. **Settings** - Configuración de PreSett

---

## 3. Dashboard (Home)

### 3.1 Wireframe

```
┌─────────────────────────────────────────────────────────
│  Dashboard                                               │
─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ Status Cards ──────────────────────────────────   │
│  │  [Gentle-AI: v2.2.4 ✅]  [OpenCode: v1.18.11 ✅]│   │
│  │  [Backups: 5]  [Last sync: 2h ago]              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ Installed Agents ───────────────────────────────┐  │
│  │  ┌─────────────┐  ┌─────────────┐               │  │
│  │  │ OpenCode    │  │ Claude Code │               │  │
│  │  │ ✅ Config   │  │ ✅ Config   │               │  │
│  │  │ 14 models   │  │ 14 models   │               │  │
│  │  └─────────────┘  └─────────────┘               │  │
│  │  ┌─────────────┐  ┌─────────────┐               │  │
│  │  │ Codex       │  │ + Add Agent │               │  │
│  │  │ ✅ Config   │  │             │               │  │
│  │  │ 13 phases   │  │             │               │  │
│  │  └─────────────┘  └─────────────┘               │  │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ Quick Actions ──────────────────────────────────┐  │
│  │  [Sync Configs] [Create Profile] [View Backups]  │  │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────
```

### 3.2 Componentes

#### Status Cards
- **Gentle-AI Version:** Con indicador de update disponible
- **Agent Version:** Por agente instalado
- **Backup Count:** Número de backups disponibles
- **Last Sync:** Tiempo desde último sync

#### Agent Cards
- **Nombre del agente**
- **Estado:** ✅ Configured / ⚠️ Partial / ❌ Missing
- **Model count:** Cantidad de modelos asignados
- **Click:** Navega a detalle del agente

#### Quick Actions
- Botones grandes para acciones comunes
- Iconos claros
- Tooltips explicativos

---

## 4. Agents Page

### 4.1 Wireframe

```
┌─────────────────────────────────────────────────────────┐
│  Agents                                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ Agent List ─────────────────────────────────────┐  │
│  │                                                    │  │
│  │  ┌─ OpenCode ──────────────────────────────────┐ │  │
│  │  │ Status: ✅ Configured                         │ │  │
│  │  │ Path: ~/.config/opencode                      │ │  │
│  │  │ Models: 14 assigned                           │ │  │
│  │  │ SDD Mode: Multi                               │ │  │
│  │  │ [Configure] [View Details]                    │ │  │
│  │  └───────────────────────────────────────────────┘ │  │
│  │                                                    │  │
│  │  ┌─ Claude Code ───────────────────────────────┐ │  │
│  │  │ Status: ✅ Configured                         │ │  │
│  │  │ Path: ~/.claude                               │ │  │
│  │  │ Models: 14 assigned                           │ │  │
│  │  │ Persona: Gentleman                            │ │  │
│  │  │ [Configure] [View Details]                    │ │  │
│  │  └─────────────────────────────────────────────── │  │
│  │                                                    │  │
│  │  ┌─ Codex ────────────────────────────────────┐ │  │
│  │  │ Status: ✅ Configured                         │ │  │
│  │  │ Path: ~/.codex                                │ │  │
│  │  │ Profile: Recommended                          │ │  │
│  │  │ Phases: 13 configured                         │ │  │
│  │  │ [Configure] [View Details]                    │ │  │
│  │  └───────────────────────────────────────────────┘ │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Models Page (OpenCode)

### 5.1 Wireframe

```
┌─────────────────────────────────────────────────────────┐
│  Models - OpenCode                                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ Current Profile ────────────────────────────────┐  │
│  │  Profile: [gentle-orchestrator ▼]                │  │
│  │  [Switch Profile] [Create New]                    │  │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─ Model Assignments ──────────────────────────────┐  │
│  │                                                    │  │
│  │  ─ gentle-orchestrator ───────────────────────┐ │  │
│  │  │ Role: Coordinator                            │ │  │
│  │  │ Model: [opencode-go/qwen3.8-max ▼]          │ │  │
│  │  │ Effort: [medium ▼]                           │ │  │
│  │  │ [Validate] [Reset to Default]                │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  │                                                    │  │
│  │  ┌─ sdd-init ──────────────────────────────────┐ │  │
│  │  │ Role: Bootstrap SDD context                  │ │  │
│  │  │ Model: [google/gemini-2.5-flash-lite ▼]     │ │  │
│  │  │ Effort: [medium ▼]                           │ │  │
│  │  └──────────────────────────────────────────────┘ │  │
│  │                                                    │  │
│  │  ... (11 SDD phases + 3 JD agents)                │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Actions ─────────────────────────────────────────┐  │
│  │  [Save Changes] [Reset All] [Sync Now]            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 5.2 Model Picker Component

```
┌─────────────────────────────────────────┐
│  Select Model                           │
├─────────────────────────────────────────
│  Provider: [OpenCode Go ▼]              │
│                                         │
│  Search: [________________]             │
│                                         │
│  ┌─ Models ────────────────────────── │
│  │  ○ qwen3.8-max                    │ │
│  │    Effort: high, max              │ │
│  │  ○ qwen3.7-plus                   │ │
│  │    Effort: high, max              │ │
│  │  ● qwen3.7-max (selected)         │ │
│  │    Effort: high, max              │ │
│  │  ○ deepseek-v4-pro                │ │
│  │    Effort: high, max              │ │
│  │  ○ kimi-k2.7-code                 │ │
│  │    Effort: high, low, medium      │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Cancel] [Confirm]                     │
└─────────────────────────────────────────┘
```

---

## 6. Profiles Page (OpenCode)

### 6.1 Wireframe

```
┌─────────────────────────────────────────────────────────┐
│  SDD Profiles - OpenCode                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ Profile List ───────────────────────────────────┐  │
│  │                                                    │  │
│  │  ┌─ gentle-orchestrator (default) ─────────────┐ │  │
│  │  │ Status: ✅ Active                             │ │  │
│  │  │ Models: 14 configured                         │ │  │
│  │  │ [Edit] [Cannot Delete]                        │ │  │
│  │  └─────────────────────────────────────────────── │  │
│  │                                                    │  │
│  │  ┌─ cheap ─────────────────────────────────────┐ │  │
│  │  │ Status: ○ Inactive                            │ │  │
│  │  │ Models: 14 configured                         │ │  │
│  │  │ [Edit] [Activate] [Delete]                    │ │  │
│  │  └───────────────────────────────────────────────┘ │  │
│  │                                                    │  │
│  │  ┌─ premium ───────────────────────────────────┐ │  │
│  │  │ Status: ○ Inactive                            │ │  │
│  │  │ Models: 14 configured                         │ │  │
│  │  │ [Edit] [Activate] [Delete]                    │ │  │
│  │  └───────────────────────────────────────────────┘ │  │
│  │                                                    │  │
│  │  [+ Create New Profile]                            │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Create Profile Flow

```
Step 1: Name
┌─────────────────────────────────────────┐
│  Create New Profile                     │
├─────────────────────────────────────────┤
│  Name: [cheap________________]          │
│                                         │
│  Validation: ✅ Valid slug              │
│                                         │
│  [Cancel] [Next →]                      │
└─────────────────────────────────────────┘

Step 2: Orchestrator Model
┌─────────────────────────────────────────┐
│  Select Orchestrator Model              │
├─────────────────────────────────────────┤
│  Provider: [OpenCode Go ▼]              │
│  Model: [qwen3.7-plus ▼]               │
│  Effort: [medium ▼]                     │
│                                         │
│  [← Back] [Next →]                      │
└─────────────────────────────────────────┘

Step 3: Phase Models
┌─────────────────────────────────────────┐
│  Assign Phase Models                    │
├─────────────────────────────────────────┤
│  [Set All Phases] [Configure Each]      │
│                                         │
│  ┌─ sdd-init ────────────────────────┐ │
│  │ Model: [gemini-2.5-flash-lite ▼]  │ │
│  │ Effort: [medium ▼]                 │ │
│  ───────────────────────────────────┘ │
│                                         │
│  ... (repeat for each phase)            │
│                                         │
│  [← Back] [Create Profile]              │
└─────────────────────────────────────────┘
```

---

## 7. Backups Page

### 7.1 Wireframe

```
┌─────────────────────────────────────────────────────────┐
│  Backups                                                 │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ Backup List ────────────────────────────────────  │
│  │                                                    │  │
│  │  ┌─ 2026-08-02 15:35:36 ───────────────────────┐ │  │
│  │  │ Source: install                               │ │  │
│  │  │ Files: 15                                     │ │  │
│  │  │ Size: 2.3 MB                                  │ │  │
│  │  │ 📌 Pinned                                     │ │  │
│  │  │ [Restore] [Unpin] [Delete]                    │ │  │
│  │  └───────────────────────────────────────────────┘ │  │
│  │                                                    │  │
│  │  ┌─ 2026-07-30 20:03:14 ───────────────────────┐ │  │
│  │  │ Source: sync                                  │ │  │
│  │  │ Files: 12                                     │ │  │
│  │  │ Size: 1.8 MB                                  │ │  │
│  │  │ [Restore] [Pin] [Delete]                      │ │  │
│  │  └───────────────────────────────────────────────┘ │  │
│  │                                                    │  │
│  │  ... (3 more backups)                               │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Info: Keeping 5 most recent backups. Pinned backups     │
│  are never automatically deleted.                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Componentes UI

### 8.1 Status Indicators

```typescript
type Status = 'success' | 'warning' | 'error' | 'info'

interface StatusIndicator {
  status: Status
  label: string
  tooltip?: string
}

// Examples:
// ✅ Configured (success)
// ⚠️ Partial (warning)
// ❌ Missing (error)
// ️ Info (info)
```

### 8.2 Model Selector

```typescript
interface ModelSelectorProps {
  providers: Provider[]
  selectedModel?: string
  selectedEffort?: string
  onChange: (model: string, effort: string) => void
  validation?: ValidationResult
}
```

### 8.3 Confirmation Dialog

```typescript
interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  variant: 'danger' | 'warning' | 'info'
  onConfirm: () => void
  onCancel: () => void
}
```

---

## 9. Responsive Design

### 9.1 Breakpoints

- **Mobile:** < 768px
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

### 9.2 Adaptaciones

- **Mobile:** Sidebar colapsable, cards en columna
- **Tablet:** Sidebar visible, grid 2 columnas
- **Desktop:** Layout completo, grid 3-4 columnas

---

## 10. Accesibilidad

### 10.1 Requisitos

- **Keyboard navigation:** Todos los elementos accesibles
- **Screen readers:** ARIA labels correctos
- **Contrast:** WCAG AA mínimo
- **Focus indicators:** Visibles claramente

### 10.2 Testing

- Test con keyboard only
- Test con screen reader (NVDA, VoiceOver)
- Test de contraste de colores

---

## 11. Animaciones

### 11.1 Principios

- **Purposeful:** Solo para feedback o transiciones
- **Subtle:** No distraer
- **Fast:** < 300ms
- **Consistent:** Mismos patrones

### 11.2 Ejemplos

- **Save success:** Checkmark animation
- **Validation error:** Shake en input
- **Page transition:** Fade in/out
- **Modal:** Scale + fade

---

## 12. Próximos Pasos

1. **Crear mockups en Figma** (o similar)
2. **Definir design system** (colores, tipografía, spacing)
3. **Implementar componentes base** (Button, Input, Card, etc.)
4. **Implementar layouts** (Dashboard, Agents, Models)
5. **User testing** con configuraciones reales

---

**Documento creado:** 2026-08-02  
**Última actualización:** 2026-08-02  
**Diseñador:** TBD
