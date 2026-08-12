export interface OpenCodeAgentEntry {
  description?: string;
  mode?: string;
  model?: string;
  variant?: string;
  prompt?: string;
  tools?: unknown;
  permission?: unknown;
}

export interface OpenCodeConfig {
  $schema?: string;
  default_agent?: string;
  agent: Record<string, OpenCodeAgentEntry>;
  mcp?: unknown;
  permission?: unknown;
  plugin?: unknown[];
  share?: string;
  theme?: string;
}
