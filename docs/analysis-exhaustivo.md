# PreSett - Análisis Exhaustivo de Gentle-AI

**Fecha:** 2026-08-02  
**Versión Gentle-AI:** 2.2.4  
**Objetivo:** Documentar todos los flujos de configuración para diseñar PreSett

---

## 1. Menú Principal de Gentle-AI (TUI)

De las capturas de pantalla, el menú principal tiene estas opciones:

```
Menu
▶ Start installation
  Upgrade tools (up to date)
  Sync configs
  Upgrade + Sync
  Configure models
  Create your own Agent
  OpenCode Community Plugins
  Uninstall OpenCode Plugin
  OpenCode SDD Profiles
  Manage backups
  Managed uninstall
  Community Tools/Plugins
  Quit
```

### Atajos del menú y qué hace cada uno

| Atajo | Descripción | Archivos que modifica |
|-------|-------------|----------------------|
| **Start installation** | Instalación inicial completa | `state.json`, configs de agentes |
| **Upgrade tools** | Actualiza binaries (gentle-ai, engram, gga) | Binaries en PATH |
| **Sync configs** | Sincroniza assets gestionados con versión actual | Prompts, skills, MCP configs, SDD orchestrators |
| **Upgrade + Sync** | Combina upgrade + sync | Binaries + configs |
| **Configure models** | Asigna modelos a fases SDD y agentes JD | `state.json`, `opencode.json` |
| **Create your own Agent** | Crea agente personalizado | TBD |
| **OpenCode Community Plugins** | Gestiona plugins de comunidad para OpenCode | `~/.config/opencode/tui.json` |
| **Uninstall OpenCode Plugin** | Remove plugin específico de OpenCode | `~/.config/opencode/tui.json`, `node_modules/` |
| **OpenCode SDD Profiles** | Crea/gestiona perfiles de modelos SDD | `opencode.json` |
| **Manage backups** | Visualiza/restaura backups | `~/.gentle-ai/backups/` |
| **Managed uninstall** | Desinstala config gestionada de agentes | Configs de agentes seleccionados |
| **Community Tools/Plugins** | Gestiona herramientas/plugins de comunidad | Varios |

---

## 2. Flujo de Instalación (Start Installation)

### 2.1 System Detection

```
System Detection
  OS: windows (amd64)
  Shell: powershell
  Supported: Yes

Tools
  brew: not found
  curl: found
  git: found
  go: found
  node: found

Dependencies
  git: 2.37.1
  curl: 8.21.0
  node: 24.15.0
  npm: 11.12.1
  go: 1.26.5 (optional)

Detected Configs
  claude-code: present
  opencode: present
  kilocode: present
  gemini-cli: present
  cursor: present
  vscode-copilot: present
  codex: present
  antigravity: missing
  windsurf: missing
  kimi: missing
  qwen-code: missing
  kiro-ide: missing
  openclaw: missing
  pi: missing
  trae-ide: missing
  hermes: missing
```

**Archivos/paths que detecta:**
- `~/.claude` → claude-code
- `~/.config/opencode` → opencode
- `~/.config/kilo` → kilocode
- `~/.gemini` → gemini-cli
- `~/.cursor` → cursor
- `~/.copilot` + VS Code User profile → vscode-copilot
- `~/.codex` → codex
- `~/.gemini/antigravity` → antigravity
- `~/.codeium/windsurf` → windsurf
- `~/.kimi` → kimi
- `~/.qwen` → qwen-code
- `~/.kiro` → kiro-ide
- `~/.openclaw` → openclaw
- `~/.pi` → pi
- `~/.trae` → trae-ide
- `~/.hermes` → hermes

### 2.2 Select AI Agents

```
Select AI Agents
Use j/k to move, space to toggle, enter to continue.

[x] claude-code
[x] opencode
[ ] kilocode
[x] gemini-cli
[x] codex
[x] cursor
[x] vscode-copilot
[ ] antigravity
[ ] windsurf
[ ] kimi
[ ] qwen-code
[ ] kiro-ide
[ ] openclaw
[ ] pi
[ ] trae-ide
[ ] hermes

Continue
Back
```

### 2.3 Choose your Persona

```
Choose your Persona
Your own Gentleman! teaches before it solves.

(*) gentleman
    Voseo conversation; English technical artifacts
( ) gentleman-neutral-artifacts
    Voseo conversation; English technical artifacts (legacy alias)
( ) neutral
    No regional conversation tone; English technical artifacts
( ) custom
    Do not install a managed persona; choose themes/logo on the next screens

Back
```

### 2.4 Select Ecosystem Preset

```
Select Ecosystem Preset

(*) Dev Stack + Polish
    Dev Stack plus managed themes and logo polish
( ) Dev Stack
    Memory + SDD + skills + docs + GGA
( ) Memory Only
    Just Engram persistent memory across sessions
( ) Custom
    Choose each component manually: memory, persona, themes, logo, and more

Back
```

**Componentes disponibles:**
- `engram` - Persistent cross-session memory
- `sdd` - Spec-Driven Development workflow
- `skills` - Curated coding skill library
- `context7` - MCP server for live documentation
- `persona` - Managed Gentleman/neutral persona
- `permissions` - Security-first defaults
- `gga` - Gentleman Guardian Angel
- `theme` - Gentleman Kanagawa theme

### 2.5 Claude Model Assignments

```
Claude Model Assignments
Current: custom

Choose how Claude models are assigned to each SDD phase:

( ) balanced
    Smart defaults: opus for architecture, sonnet for most phases, haiku for archiving
( ) performance
    Maximum quality: opus for architecture, planning & verification phases
( ) economy
    Cost-optimised: sonnet for all phases, haiku for archiving
( ) diversity
    Diversity: Opus for Judge A, Haiku for Judge B, Sonnet for fixes
(*) custom
    Pick model and supported effort for each SDD phase, JD agent, and general delegation entry individually

← Back
```

### 2.6 Codex Model Assignments

```
Codex Model Assignments

Choose the reasoning_effort tier for Codex SDD phases (tied to your ChatGPT plan):

( ) Low-cost - Orquestador gpt-5.6-terra/medium · Razonamiento gpt-5.6-sol/medium · Código gpt-5.6-terra/medium · Liviano gpt-5.6-luna/high
    Lowest-cost GPT-5.6 mix - Terra for work, Luna for lightweight phases
(*) Recommended - Orquestador gpt-5.6-sol/medium · Razonamiento gpt-5.6-sol/medium · Código gpt-5.6-terra/high · Liviano gpt-5.6-luna/high
    Balanced GPT-5.6 mix - Sol for reasoning, Terra for code, Luna for light work
( ) Powerful - Orquestador gpt-5.6-sol/medium · Razonamiento gpt-5.6-sol/xhigh · Código gpt-5.6-sol/high · Liviano gpt-5.6-luna/high
    High-effort GPT-5.6 mix - Sol for reasoning, Terra for code, Luna for light work
Custom - per-phase model + effort
    Assign a specific model and effort to each of the 13 SDD phases

← Back
```

**Perfiles Codex:**

| Perfil | Orchestrator | sdd-strong | sdd-mid | sdd-cheap |
|--------|--------------|------------|---------|-----------|
| Low-cost | gpt-5.6-terra/medium | gpt-5.6-sol/medium | gpt-5.6-terra/medium | gpt-5.6-luna/high |
| Recommended | gpt-5.6-sol/medium | gpt-5.6-sol/medium | gpt-5.6-terra/high | gpt-5.6-luna/high |
| Powerful | gpt-5.6-sol/medium | gpt-5.6-sol/xhigh | gpt-5.6-sol/high | gpt-5.6-luna/high |

### 2.7 Select SDD Mode

```
Select SDD Mode
How should the SDD orchestrator be configured for OpenCode?

( ) single
    Single orchestrator - one agent handles all SDD phases
( ) multi
    Multi-agent - dedicated sub-agent per SDD phase (9 hidden agents)

Back
```

### 2.8 Assign Models to SDD, JD & Review Agents

```
Assign Models to SDD, JD & Review Agents
LM Studio discovery failed; using configured models.

Current assignments:
▶ gentle-orchestrator (coordinator) (default)
  Set all SDD phases    (not set)
  sdd-init              (default)
  sdd-explore           (default)
  sdd-propose           (default)
  sdd-spec              (default)
  sdd-design            (default)
  sdd-tasks             (default)
  sdd-apply             (default)
  sdd-verify            (default)
  sdd-archive           (default)
  sdd-onboard           (default)
  --- Judgment Day ---
  jd-judge-a            (default)
  jd-judge-b            (default)
  jd-fix-agent          (default)
  ↓ more assignments

Continue
← Back
```

### 2.9 Select Provider

```
Select provider:
▶ Anthropic (13 models)
  Google (24 models)
  OpenCode Go (24 models)
  OpenCode Zen (85 models)
```

---

## 3. Archivos de Configuración por Agente

### 3.1 OpenCode (foco principal)

**Config path:** `~/.config/opencode/`

**Archivos gestionados:**
```
~/.config/opencode/
├── opencode.json              # Agentes, modelos, prompts, permisos, MCP
├── opencode.jsonc             # Config con comentarios
├── package.json               # Dependencies (plugins)
├── package-lock.json          # Lock file
├── tui.json                   # Plugins TUI
├── .gentle-ai-default-agent.json  # Estado del agente default
├── prompts/
│   └── sdd/
│       ├── sdd-apply.md
│       ├── sdd-archive.md
│       ├── sdd-design.md
│       ├── sdd-explore.md
│       ├── sdd-init.md
│       ├── sdd-onboard.md
│       ├── sdd-propose.md
│       ├── sdd-spec.md
│       ├── sdd-tasks.md
│       └── sdd-verify.md
├── node_modules/              # Plugins instalados
└── plugins/                   # Plugins de Gentle-AI
```

**Estructura de `opencode.json`:**
```json
{
  "$schema": "https://opencode.ai/config.json",
  "agent": {
    "gentle-orchestrator": {
      "description": "...",
      "mode": "primary",
      "model": "opencode-go/qwen3.8-max",
      "permission": { ... },
      "prompt": "...",
      "tools": { ... },
      "variant": "medium"
    },
    "sdd-init": { ... },
    "sdd-explore": { ... },
    // ... 10 agentes SDD + 3 Judgment Day
  },
  "default_agent": "gentle-orchestrator",
  "mcp": {
    "context7": { ... },
    "engram": { ... }
  },
  "permission": { ... },
  "plugin": [ ... ],
  "share": "disabled",
  "theme": "system"
}
```

**Perfiles SDD (multi-profile mode):**
- Base: `gentle-orchestrator`
- Named profiles: `sdd-orchestrator-{name}` + `sdd-{phase}-{name}`
- Switching: Tab key in OpenCode

### 3.2 Claude Code

**Config path:** `~/.claude/`

**Archivos gestionados:**
```
~/.claude/
├── CLAUDE.md                  # System prompt (markdown sections)
── mcp/
│   └── *.json                 # MCP servers config
├── output-styles/
│   └── *.md                   # Output styles
├── skills/
│   └── *.md                   # Skills
└── agents/                    # Sub-agents (si aplica)
```

**Delegación:** Full (Task tool con context windows aislados)

### 3.3 Codex

**Config path:** `~/.codex/`

**Archivos gestionados:**
```
~/.codex/
├── config.toml                # Config principal (TOML)
├── AGENTS.md                  # System prompt
├── engram-instructions.md     # Engram instructions
├── skills/
│   └── *.md                   # Skills
├── <profile>.config.toml      # Perfiles de modelos SDD
└── features.multi_agent       # Multi-agent experimental
```

**Estructura de `config.toml`:**
```toml
[model]
# Model assignments

[mcp_servers.engram]
# Engram MCP config

[mcp_servers.context7]
# Context7 MCP config

[features]
multi_agent = false

[agents]
max_threads = 4
max_depth = 2
```

**Perfiles Codex:**
- Low-cost, Recommended, Powerful
- Custom: per-phase model + effort
- 13 fases SDD totales

---

## 4. Sistema de Backups

**Path:** `~/.gentle-ai/backups/`

**Estructura:**
```
~/.gentle-ai/backups/
├── 20260728220843.908529900/
│   ├── manifest.json
│   └── snapshot.tar.gz
├── 20260730155217.788709300/
│   ├── manifest.json
│   └── snapshot.tar.gz
── ...
```

**manifest.json:**
```json
{
  "source": "install|sync|upgrade",
  "timestamp": "2026-07-28T22:08:43.908529900Z",
  "file_count": 15,
  "checksum": "sha256:...",
  "pinned": false,
  "files": [
    {
      "path": "~/.config/opencode/opencode.json",
      "existed": true
    }
  ]
}
```

**Política de retención:**
- Keep count: 5 backups más recientes
- Pinned: nunca se eliminan
- Duplicates: se saltan (dedup)
- Compression: tar.gz (~75% más pequeño)

---

## 5. Cache de Modelos

**Path:** `~/.gentle-ai/cache/model-variants.json`

**Estructura:**
```json
{
  "opencode-go": {
    "qwen3.7-plus": ["high", "max"],
    "qwen3.8-max": ["high", "max"],
    "deepseek-v4-flash": ["high", "low", "max"],
    // ...
  },
  "anthropic": {
    "claude-sonnet-4-6": ["high", "low", "max", "medium"],
    // ...
  },
  "google": {
    "gemini-2.5-flash-lite": ["high", "max"],
    // ...
  }
}
```

**Actualización:** Plugin `model-variants` de OpenCode lo actualiza en cada startup.

---

## 6. state.json (Config Global de Gentle-AI)

**Path:** `~/.gentle-ai/state.json`

**Estructura completa:**
```json
{
  "installed_agents": [
    "opencode",
    "claude-code",
    "codex",
    "cursor",
    "vscode-copilot",
    "gemini-cli"
  ],
  "selection_configured": true,
  "components": [
    "engram",
    "sdd",
    "skills",
    "context7",
    "permissions",
    "gga",
    "claude-theme",
    "opencode-gentle-logo",
    "persona"
  ],
  "preset": "full-gentleman",
  "sdd_mode": "multi",
  "strict_tdd": true,
  "community_tools": [
    "codegraph"
  ],
  "community_tools_configured": true,
  "claude_phase_assignments": {
    "default": { "model": "sonnet" },
    "jd-fix-agent": { "model": "sonnet" },
    "jd-judge-a": { "model": "sonnet" },
    "jd-judge-b": { "model": "sonnet" },
    "sdd-apply": { "model": "sonnet" },
    "sdd-archive": { "model": "haiku" },
    "sdd-design": { "model": "opus" },
    "sdd-explore": { "model": "sonnet" },
    "sdd-init": { "model": "haiku" },
    "sdd-onboard": { "model": "haiku" },
    "sdd-propose": { "model": "opus" },
    "sdd-spec": { "model": "sonnet" },
    "sdd-tasks": { "model": "haiku" },
    "sdd-verify": { "model": "sonnet" }
  },
  "codexModelAssignments": {
    "default": "medium",
    "jd-fix-agent": "high",
    "jd-judge-a": "medium",
    "jd-judge-b": "medium",
    "sdd-apply": "high",
    "sdd-archive": "high",
    "sdd-design": "medium",
    "sdd-explore": "medium",
    "sdd-onboard": "high",
    "sdd-propose": "medium",
    "sdd-spec": "high",
    "sdd-tasks": "high",
    "sdd-verify": "medium"
  },
  "codexOrchestratorAssignment": {
    "model": "gpt-5.6-sol",
    "effort": "medium"
  },
  "codexCarrilModelAssignments": {
    "sdd-cheap": "gpt-5.6-luna",
    "sdd-mid": "gpt-5.6-terra",
    "sdd-strong": "gpt-5.6-sol"
  },
  "model_assignments": {
    "gentle-orchestrator": {
      "provider_id": "opencode-go",
      "model_id": "qwen3.8-max",
      "effort": "medium"
    },
    "sdd-init": {
      "provider_id": "google",
      "model_id": "gemini-2.5-flash-lite",
      "effort": "medium"
    },
    // ... todos los agentes SDD y JD
  },
  "persona": "gentleman",
  "last_update_check": "2026-08-02T15:35:36Z"
}
```

---

## 7. Flujos que PreSett debe cubrir

### 7.1 Gestión de Modelos

**Para OpenCode:**
- [ ] Listar modelos disponibles por provider
- [ ] Asignar modelo a `gentle-orchestrator`
- [ ] Asignar modelos a fases SDD (11 agentes)
- [ ] Asignar modelos a Judgment Day (3 agentes)
- [ ] Crear perfiles SDD (named profiles)
- [ ] Switch entre perfiles
- [ ] Validar effort levels contra cache

**Para Claude Code:**
- [ ] Asignar modelos a fases SDD (claude_phase_assignments)
- [ ] Seleccionar preset (balanced/performance/economy/diversity/custom)

**Para Codex:**
- [ ] Seleccionar perfil (Low-cost/Recommended/Powerful/Custom)
- [ ] Asignar modelo y effort por fase (13 fases)
- [ ] Configurar orchestrator model y effort

### 7.2 Gestión de Agentes

- [ ] Detectar agentes instalados
- [ ] Seleccionar/deseleccionar agentes
- [ ] Ver config path de cada agente
- [ ] Ver estado de configuración (present/missing)

### 7.3 Gestión de Componentes

- [ ] Toggle de componentes (engram, sdd, skills, context7, etc.)
- [ ] Ver componentes activos
- [ ] Seleccionar preset (full-gentleman/ecosystem-only/minimal/custom)

### 7.4 Gestión de Persona

- [ ] Seleccionar persona (gentleman/neutral/custom)
- [ ] Ver descripción de cada persona

### 7.5 Gestión de SDD Mode

- [ ] Seleccionar modo (single/multi)
- [ ] Ver diferencia entre modos
- [ ] Configurar strict_tdd

### 7.6 Gestión de Backups

- [ ] Listar backups disponibles
- [ ] Ver metadata de cada backup
- [ ] Restaurar backup
- [ ] Pin/unpin backup
- [ ] Delete backup
- [ ] Rename backup

### 7.7 Sync y Upgrade

- [ ] Ejecutar sync
- [ ] Ejecutar upgrade
- [ ] Ver estado de herramientas (up to date/outdated)
- [ ] Preview de cambios (dry-run)

### 7.8 Community Plugins (OpenCode)

- [ ] Listar plugins disponibles
- [ ] Instalar plugin
- [ ] Desinstalar plugin
- [ ] Ver estado de plugins

### 7.9 Community Tools

- [ ] Listar herramientas de comunidad
- [ ] Configurar herramientas (codegraph, etc.)

---

## 8. Validaciones necesarias

### 8.1 Validación de Modelos

```typescript
function validateModelAssignment(agent: string, model: string, provider: string): ValidationResult {
  // 1. Verificar que el provider existe
  // 2. Verificar que el modelo existe en el provider
  // 3. Verificar effort levels disponibles
  // 4. Verificar compatibilidad con el agente
  // 5. Verificar que no rompe dependencias
}
```

### 8.2 Validación de Schema

```typescript
function validateStateJson(state: StateJson): ValidationResult {
  // 1. Verificar estructura de installed_agents
  // 2. Verificar componentes válidos
  // 3. Verificar preset válido
  // 4. Verificar sdd_mode (single/multi)
  // 5. Verificar model_assignments
  // 6. Verificar claude_phase_assignments
  // 7. Verificar codexModelAssignments
}
```

### 8.3 Sincronización entre archivos

```typescript
function syncModelAssignments(stateJson: StateJson, opencodeJson: OpenCodeJson): SyncResult {
  // 1. Leer ambos archivos
  // 2. Comparar model_assignments
  // 3. Detectar discrepancias
  // 4. Sincronizar (con backup previo)
  // 5. Validar resultado
}
```

---

## 9. Arquitectura de PreSett

### 9.1 Agent Adapters

```typescript
interface AgentAdapter {
  agentId: string;
  configPath: string;
  readFile(): Promise<AgentConfig>;
  writeFile(config: AgentConfig): Promise<void>;
  validate(config: AgentConfig): ValidationResult;
  getModels(): Promise<Model[]>;
  sync(stateJson: StateJson): Promise<SyncResult>;
}

class OpenCodeAdapter implements AgentAdapter { ... }
class ClaudeCodeAdapter implements AgentAdapter { ... }
class CodexAdapter implements AgentAdapter { ... }
```

### 9.2 Config Manager

```typescript
class ConfigManager {
  private adapters: Map<string, AgentAdapter>;
  private stateJson: StateJson;
  
  async loadAll(): Promise<void>;
  async saveAll(): Promise<void>;
  async syncAll(): Promise<SyncResult>;
  async backup(): Promise<BackupInfo>;
  async restore(backupId: string): Promise<void>;
}
```

### 9.3 UI Components

```typescript
// Dashboard
- AgentList (detectados, seleccionados)
- ModelAssignmentTable (por agente)
- ComponentToggleList
- BackupManager

// Model Picker
- ProviderSelector
- ModelSelector (filtrado por provider)
- EffortLevelSelector
- ValidationIndicator

// Profile Manager (OpenCode)
- ProfileList
- ProfileEditor
- ProfileSwitcher
```

---

## 10. Scope recomendado para MVP

**Fase 1 (Core):**
- Solo OpenCode (el más complejo y usado)
- Gestión de modelos para SDD phases
- Gestión de modelos para Judgment Day
- Crear/editar perfiles SDD
- Backups (read-only, usar los de gentle-ai)

**Fase 2 (Multi-agent):**
- Agregar Claude Code
- Agregar Codex
- Sincronización entre agentes

**Fase 3 (Advanced):**
- Community plugins
- Community tools
- Custom agents
- Workspace scope

---

## 11. Riesgos y mitigaciones

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Corromper JSON | Alta | Backups + validación de schema |
| Desincronizar archivos | Alta | Transacciones atómicas |
| Modelo inexistente | Media | Validación contra `opencode models` |
| Cache desactualizado | Media | Refresh manual del cache |
| Permisos de escritura | Baja | Verificar antes de escribir |
| Breaking changes en gentle-ai | Media | Versionar adapters |

---

## 12. Próximos pasos

1. **Definir stack técnico** (Next.js + React + Node confirmado)
2. **Diseñar UI/UX** (wireframes para dashboard principal)
3. **Implementar OpenCode adapter** (lector/escritor de opencode.json)
4. **Implementar model picker** (con validación)
5. **Implementar profile manager** (crear/editar/switch)
6. **Integrar con sistema de backups** (read-only)
7. **Testing** (validar que no rompe configs existentes)
8. **Deploy** (PM2 + IIS reverse proxy)

---

**Documento generado:** 2026-08-02  
**Versión:** 1.0  
**Estado:** Draft para review
