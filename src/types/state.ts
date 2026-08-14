export interface ModelAssignment {
  provider_id: string;
  model_id: string;
  effort: string;
}

export interface ClaudePhaseAssignment {
  model: string;
}

export interface CodexOrchestratorAssignment {
  model: string;
  effort: string;
}

export interface StateJson {
  installed_agents: string[];
  selection_configured: boolean;
  components: string[];
  preset: string;
  sdd_mode: "single" | "multi";
  strict_tdd: boolean;
  community_tools: string[];
  community_tools_configured: boolean;
  claude_phase_assignments: Record<string, ClaudePhaseAssignment>;
  codexModelAssignments: Record<string, string>;
  codexOrchestratorAssignment: CodexOrchestratorAssignment;
  codexCarrilModelAssignments: Record<string, string>;
  model_assignments: Record<string, ModelAssignment>;
  persona: string;
  language?: Locale;
  last_update_check?: string;
}

export type Locale = "es" | "en";
