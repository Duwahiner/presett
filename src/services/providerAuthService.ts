import { promisify } from "node:util";
import { exec as execCallback } from "node:child_process";
import type { Result, ProviderAuthError, ProviderAuthErrorCode } from "@/lib/types";
import { ok, err } from "@/lib/types";

const exec = promisify(execCallback);

// Literal constant command: never interpolated with user input, so `shell: true`
// on Windows cannot be leveraged for command injection.
const PROVIDER_AUTH_COMMAND = "opencode auth list";
const PROVIDER_AUTH_TIMEOUT_MS = 10_000;
const PROVIDER_AUTH_MAX_BUFFER = 1024 * 1024;

const PROVIDER_AUTH_MESSAGES: Record<
  Exclude<ProviderAuthErrorCode, "PARSE_ERROR">,
  string
> = {
  CLI_NOT_FOUND: "OpenCode CLI not found or not on PATH.",
  CLI_TIMEOUT: "OpenCode providers list timed out.",
  CLI_ERROR: "Failed to retrieve connected providers from OpenCode.",
};

const PARSE_ERROR_MESSAGE = "Failed to parse OpenCode providers output.";

export interface ConnectedProvider {
  name: string;
  authType: "api" | "oauth" | "unknown";
}

/**
 * Build a minimal environment for the subprocess containing only the variables
 * the OpenCode CLI needs to locate credentials (`HOME`, `USERPROFILE`, `PATH`).
 * Any other variable — including API keys, tokens and secrets — is deliberately
 * dropped so nothing sensitive is leaked to the child process.
 */
export function buildSafeEnv(env: Record<string, string | undefined>): Record<string, string> {
  const safeEnv: Record<string, string> = {};
  for (const key of ["HOME", "USERPROFILE", "PATH"] as const) {
    const value = env[key];
    if (typeof value === "string" && value.length > 0) {
      safeEnv[key] = value;
    }
  }
  return safeEnv;
}

/**
 * Map a raw `child_process` failure to a sanitized `ProviderAuthError`. The
 * `cause` is never surfaced; only a generic constant message is returned.
 */
export function classifyProviderAuthError(cause: unknown): ProviderAuthError {
  if (cause && typeof cause === "object") {
    const record = cause as Record<string, unknown>;
    const code = record.code;
    if (code === "ENOENT" || code === 127) {
      return { code: "CLI_NOT_FOUND", message: PROVIDER_AUTH_MESSAGES.CLI_NOT_FOUND };
    }
    const killed = record.killed === true;
    const signal = typeof record.signal === "string" ? record.signal : "";
    const message = typeof record.message === "string" ? record.message : "";
    if (killed || signal.length > 0 || /timed?\s*out|ETIMEDOUT/i.test(message)) {
      return { code: "CLI_TIMEOUT", message: PROVIDER_AUTH_MESSAGES.CLI_TIMEOUT };
    }
  }
  return { code: "CLI_ERROR", message: PROVIDER_AUTH_MESSAGES.CLI_ERROR };
}

/**
 * Parse CLI output into a `Result`, mapping any parser failure to `PARSE_ERROR`
 * with a sanitized message. `parse` is injectable for testability.
 */
export function parseConnectedProvidersSafe(
  output: string,
  parse: (output: string) => ConnectedProvider[] = parseConnectedProviders,
): Result<ConnectedProvider[], ProviderAuthError> {
  try {
    return ok(parse(output));
  } catch {
    return err({ code: "PARSE_ERROR", message: PARSE_ERROR_MESSAGE });
  }
}

/**
 * Remove ANSI color codes from a string.
 */
function stripAnsiCodes(text: string): string {
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
    if (!trimmed) continue;
    // Lines with • (U+2022) or ● (U+25CF) indicate a connected provider
    if (/^[•●]/.test(trimmed)) {
      const content = trimmed.replace(/^[•●]/, "").trim();
      const parts = content.split(/\s+/);
      
      if (parts.length >= 2) {
        const authType = parts[parts.length - 1];
        const name = parts.slice(0, -1).join(" ");
        
        providers.push({
          name,
          authType: authType === "api" || authType === "oauth" ? authType : "unknown",
        });
      }
      continue;
    }

    const column = parseTabularRow(trimmed);
    if (column) providers.push(column);
  }

  return providers;
}

/**
 * Parse one row of the opencode 2.x `auth list` table, e.g.
 * `Anthropic  OAuth                       stored`.
 *
 * Columns are separated by two or more spaces (provider names may contain single
 * spaces). A row is accepted only when the credential type is recognized
 * (`OAuth` / `API key`) or the row ends with the `stored` status column; this
 * keeps headers, summaries and box-drawing decoration out of the result.
 */
function parseTabularRow(line: string): ConnectedProvider | null {
  const columns = line.split(/\s{2,}/).filter((column) => column.length > 0);
  if (columns.length < 2) return null;

  const name = columns[0];
  if (/^[┌│└├─◇◆]/.test(name)) return null;

  const type = columns[1].toLowerCase();
  const hasStoredStatus = columns.length >= 3 && columns[columns.length - 1].toLowerCase() === "stored";

  if (type === "oauth") return { name, authType: "oauth" };
  if (type === "api key" || type === "api") return { name, authType: "api" };
  if (hasStoredStatus) return { name, authType: "unknown" };
  return null;
}

/**
 * Get the list of connected providers from OpenCode CLI.
 *
 * The CLI is invoked deterministically: with a whitelisted environment that
 * preserves `HOME`/`USERPROFILE`/`PATH` (so Windows resolves the binary) and an
 * explicit timeout. `exec` always spawns through the platform default shell, so
 * the constant command resolves correctly on every OS without overriding it. Any
 * failure is returned as a typed `ProviderAuthError` instead of being silently
 * flattened.
 */
export async function getConnectedProvidersSafe(): Promise<
  Result<ConnectedProvider[], ProviderAuthError>
> {
  const options: {
    env: NodeJS.ProcessEnv;
    timeout: number;
    maxBuffer: number;
  } = {
    // buildSafeEnv deliberately drops NODE_ENV; re-cast to the exec option type,
    // which (augmented by Next) requires NODE_ENV, even though only the three
    // whitelisted keys are meaningful to the child process.
    env: buildSafeEnv(process.env) as unknown as NodeJS.ProcessEnv,
    timeout: PROVIDER_AUTH_TIMEOUT_MS,
    maxBuffer: PROVIDER_AUTH_MAX_BUFFER,
  };

  try {
    const { stdout } = await exec(PROVIDER_AUTH_COMMAND, options);
    return parseConnectedProvidersSafe(stdout);
  } catch (cause) {
    return err(classifyProviderAuthError(cause));
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
