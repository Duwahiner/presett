import { promisify } from "node:util";
import { exec as execCallback } from "node:child_process";
import type { Result } from "@/lib/types";
import { ok, err } from "@/lib/types";

const exec = promisify(execCallback);

export interface ConnectedProvider {
  name: string;
  authType: "api" | "oauth" | "unknown";
}

/**
 * Remove ANSI color codes from a string.
 */
function stripAnsiCodes(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

/**
 * Parse the output of `opencode providers list` to extract connected providers.
 * 
 * Example output:
 * ```
 * ┌  Credentials ~/.local/share/opencode/auth.json
 * │
 * ●  OpenCode Go api
 * │
 * ●  OpenAI oauth
 * │
 * └  5 credentials
 * ```
 */
export function parseConnectedProviders(output: string): ConnectedProvider[] {
  const providers: ConnectedProvider[] = [];
  const cleanOutput = stripAnsiCodes(output);
  const lines = cleanOutput.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    // Lines with ● indicate a connected provider
    if (trimmed.startsWith("●")) {
      const content = trimmed.substring(1).trim();
      const parts = content.split(/\s+/);
      
      if (parts.length >= 2) {
        const authType = parts[parts.length - 1];
        const name = parts.slice(0, -1).join(" ");
        
        providers.push({
          name,
          authType: authType === "api" || authType === "oauth" ? authType : "unknown",
        });
      }
    }
  }

  return providers;
}

/**
 * Get the list of connected providers from OpenCode CLI.
 */
export async function getConnectedProvidersSafe(): Promise<Result<ConnectedProvider[]>> {
  try {
    const { stdout } = await exec("opencode providers list", {
      maxBuffer: 1024 * 1024,
      timeout: 10000,
    });
    
    return ok(parseConnectedProviders(stdout));
  } catch (cause) {
    return err({
      code: "FILE_MISSING",
      message: "Failed to retrieve connected providers from OpenCode",
      cause,
    });
  }
}

/**
 * Map provider display names from `opencode providers list` to catalog provider IDs.
 * 
 * This is necessary because the CLI output uses display names like "OpenAI", "Google",
 * while the catalog uses provider IDs like "openai", "google".
 */
export function normalizeProviderName(displayName: string): string {
  const normalized = displayName.toLowerCase().trim();
  
  // Common mappings
  const mappings: Record<string, string> = {
    "opencode go": "opencode-go",
    "opencode zen": "opencode",
    "openai": "openai",
    "google": "google",
    "anthropic": "anthropic",
    "x ai": "xai",
    "xai": "xai",
  };

  return mappings[normalized] ?? normalized.replace(/\s+/g, "-");
}
