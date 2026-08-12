export type AgentId =
  | "opencode"
  | "claude-code"
  | "codex"
  | "cursor"
  | "vscode-copilot"
  | "gemini-cli"
  | "kilo"
  | string;

export interface AgentDetectionResult {
  agentId: AgentId;
  installed: boolean;
  configPath: string;
  version?: string;
}

export interface AgentConfig {
  agentId: AgentId;
  configPath: string;
  raw: unknown;
}
