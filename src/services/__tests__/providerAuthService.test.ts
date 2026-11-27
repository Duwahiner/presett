import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProviderAuthErrorCode } from "@/lib/types";
import {
  parseConnectedProviders,
  normalizeProviderName,
  buildSafeEnv,
  classifyProviderAuthError,
  parseConnectedProvidersSafe,
  getConnectedProvidersSafe,
} from "../providerAuthService";

// Hoisted before the mock factory so the module under test can reference it.
const execMock = vi.hoisted(() => ({ exec: vi.fn() }));

// The service wraps `exec` with `promisify` at module load. This mock replaces
// the underlying child_process.exec; the service's promisified wrapper calls it
// with (command, options, callback), so the mock must invoke the callback in
// node style: (err, stdout, stderr).
vi.mock("node:child_process", () => ({
  exec: execMock.exec,
  default: { exec: execMock.exec },
}));

type ExecCallback = (err: unknown, result?: { stdout?: string; stderr?: string }) => void;

function mockExecSuccess(stdout: string): void {
  execMock.exec.mockImplementation((_cmd: unknown, _opts: unknown, cb: ExecCallback) => {
    // Mimic node's promisified exec: resolve a single `{ stdout, stderr }` object.
    cb(null, { stdout, stderr: "" });
  });
}

function mockExecFailure(err: unknown): void {
  execMock.exec.mockImplementation((_cmd: unknown, _opts: unknown, cb: ExecCallback) => {
    cb(err);
  });
}

describe("providerAuthService", () => {
  describe("parseConnectedProviders", () => {
    it("parses connected providers from opencode providers list output", () => {
      const output = `
┌  Credentials ~/.local/share/opencode/auth.json
│
●  OpenCode Go api
│
●  OpenAI oauth
│
●  Google oauth
│
●  Anthropic oauth
│
└  4 credentials
`;

      const result = parseConnectedProviders(output);

      expect(result).toEqual([
        { name: "OpenCode Go", authType: "api" },
        { name: "OpenAI", authType: "oauth" },
        { name: "Google", authType: "oauth" },
        { name: "Anthropic", authType: "oauth" },
      ]);
    });

    it("parses output with ANSI color codes", () => {
      const output = `\u001b[0m
\u001b[90m┌\u001b[39m  Credentials \u001b[90m~\\.local\\share\\opencode\\auth.json
\u001b[90m│\u001b[39m
\u001b[34m●\u001b[39m  OpenCode Go \u001b[90mapi
\u001b[90m│\u001b[39m
\u001b[34m●\u001b[39m  OpenAI \u001b[90moauth
\u001b[90m│\u001b[39m
\u001b[90m└\u001b[39m  2 credentials
`;

      const result = parseConnectedProviders(output);

      expect(result).toEqual([
        { name: "OpenCode Go", authType: "api" },
        { name: "OpenAI", authType: "oauth" },
      ]);
    });

    it("parses U+2022 bullets from ANSI output into five normalized provider IDs", () => {
      // Captured real CLI output: the CLI prints "•" (U+2022), which the parser
      // must accept in addition to "●" (U+25CF). Header/footer lines are present
      // to prove they stay excluded.
      const ANSI_U2022_OUTPUT = `\u001b[0m
\u001b[90m┌\u001b[39m  Credentials \u001b[90m~\\.local\\share\\opencode\\auth.json
\u001b[90m│\u001b[39m
\u001b[34m•\u001b[39m  OpenCode Go \u001b[90mapi
\u001b[90m│\u001b[39m
\u001b[34m•\u001b[39m  OpenAI \u001b[90moauth
\u001b[90m│\u001b[39m
\u001b[34m•\u001b[39m  Google \u001b[90moauth
\u001b[90m│\u001b[39m
\u001b[34m•\u001b[39m  Anthropic \u001b[90moauth
\u001b[90m│\u001b[39m
\u001b[34m•\u001b[39m  X AI \u001b[90mapi
\u001b[90m│\u001b[39m
\u001b[90m└\u001b[39m  5 credentials
`;

      const providers = parseConnectedProviders(ANSI_U2022_OUTPUT);
      const ids = providers.map((p) => normalizeProviderName(p.name));

      expect(providers).toHaveLength(5);
      expect(ids).toEqual(["opencode-go", "openai", "google", "anthropic", "xai"]);
    });

    it("handles empty output", () => {
      const result = parseConnectedProviders("");
      expect(result).toEqual([]);
    });

    it("handles output with no connected providers", () => {
      const output = `
┌  Credentials ~/.local/share/opencode/auth.json
│
└  0 credentials
`;
      const result = parseConnectedProviders(output);
      expect(result).toEqual([]);
    });

    it("handles unknown auth types", () => {
      const output = `
●  Custom Provider unknown
`;
      const result = parseConnectedProviders(output);
      expect(result).toEqual([{ name: "Custom Provider", authType: "unknown" }]);
    });
  });

  describe("normalizeProviderName", () => {
    it("normalizes known provider display names to catalog IDs", () => {
      expect(normalizeProviderName("OpenAI")).toBe("openai");
      expect(normalizeProviderName("Google")).toBe("google");
      expect(normalizeProviderName("Anthropic")).toBe("anthropic");
      expect(normalizeProviderName("OpenCode Go")).toBe("opencode-go");
      expect(normalizeProviderName("OpenCode Zen")).toBe("opencode");
      expect(normalizeProviderName("X AI")).toBe("xai");
    });

    it("handles case insensitivity", () => {
      expect(normalizeProviderName("OPENAI")).toBe("openai");
      expect(normalizeProviderName("google")).toBe("google");
    });

    it("returns normalized form for unknown providers", () => {
      expect(normalizeProviderName("Unknown Provider")).toBe("unknown-provider");
    });
  });

  describe("buildSafeEnv", () => {
    it("keeps only HOME, USERPROFILE and PATH, dropping everything else", () => {
      const result = buildSafeEnv({
        HOME: "/home/user",
        USERPROFILE: "C:\\Users\\user",
        PATH: "/usr/bin:/bin",
        OPENAI_API_KEY: "sk-secret",
        ANTHROPIC_API_KEY: "sk-ant-secret",
        NODE_ENV: "production",
      });

      expect(result).toEqual({
        HOME: "/home/user",
        USERPROFILE: "C:\\Users\\user",
        PATH: "/usr/bin:/bin",
      });
    });

    it("never leaks keys matching key, token, secret or password", () => {
      const result = buildSafeEnv({
        HOME: "/home/user",
        PATH: "/usr/bin",
        API_KEY: "abc",
        GITHUB_TOKEN: "ghp_x",
        CLIENT_SECRET: "s3cr3t",
        DB_PASSWORD: "p4ss",
      });

      const leaked = Object.keys(result).filter((k) => /key|token|secret|password/i.test(k));
      expect(leaked).toEqual([]);
    });

    it("omits variables that are missing or empty", () => {
      const result = buildSafeEnv({ HOME: "/home/user", USERPROFILE: "", PATH: "/usr/bin" });

      expect(Object.keys(result).sort()).toEqual(["HOME", "PATH"]);
      expect(buildSafeEnv({ HOME: "/home/user", USERPROFILE: "C:\\Users\\user", PATH: undefined }))
        .toEqual({ HOME: "/home/user", USERPROFILE: "C:\\Users\\user" });
    });
  });

  describe("classifyProviderAuthError", () => {
    it("maps ENOENT to CLI_NOT_FOUND", () => {
      expect(classifyProviderAuthError({ code: "ENOENT" })).toEqual({
        code: "CLI_NOT_FOUND",
        message: expect.any(String),
      });
    });

    it("maps exit code 127 (command not found) to CLI_NOT_FOUND", () => {
      expect(classifyProviderAuthError({ code: 127 })).toEqual({
        code: "CLI_NOT_FOUND",
        message: expect.any(String),
      });
    });

    it("maps a killed process (timeout) to CLI_TIMEOUT", () => {
      expect(classifyProviderAuthError({ killed: true, signal: "SIGTERM", code: null })).toEqual({
        code: "CLI_TIMEOUT",
        message: expect.any(String),
      });
    });

    it("maps an explicit timeout message to CLI_TIMEOUT", () => {
      expect(classifyProviderAuthError({ message: "Command failed: ETIMEDOUT" })).toEqual({
        code: "CLI_TIMEOUT",
        message: expect.any(String),
      });
    });

    it("maps any other failure to CLI_ERROR", () => {
      expect(classifyProviderAuthError({ code: 1, message: "boom" })).toEqual({
        code: "CLI_ERROR",
        message: expect.any(String),
      });
    });

    it("sanitizes every mapped message: no absolute paths, tokens or secrets", () => {
      const causes = [
        { code: "ENOENT", path: "C:\\Users\\user\\.open-code\\auth.json" },
        { code: 127 },
        { killed: true, signal: "SIGTERM", code: null },
        { message: "Command failed: ETIMEDOUT" },
        { code: 1, message: "stderr: OPENAI_API_KEY=sk-123" },
      ];

      for (const cause of causes) {
        const { message, code } = classifyProviderAuthError(cause);
        expect(message).toMatch(/^(OpenCode CLI not found or not on PATH|OpenCode providers list timed out|Failed to retrieve connected providers from OpenCode)\.?$/);
        expect(code).not.toBe("PARSE_ERROR");
        expect(message).not.toMatch(/[/\\]|key|token|secret|password|sk-/i);
      }
    });
  });

  describe("parseConnectedProvidersSafe", () => {
    it("returns ok with parsed providers for well-formed output", () => {
      const result = parseConnectedProvidersSafe("●  OpenAI oauth\n●  Google oauth");
      expect(result).toEqual({ ok: true, value: [
        { name: "OpenAI", authType: "oauth" },
        { name: "Google", authType: "oauth" },
      ] });
    });

    it("returns ok with empty array when output has no connected providers", () => {
      const result = parseConnectedProvidersSafe("└  0 credentials");
      expect(result).toEqual({ ok: true, value: [] });
    });

    it("returns PARSE_ERROR when the parser throws", () => {
      const result = parseConnectedProvidersSafe("anything", () => {
        throw new Error("boom");
      });
      expect(result).toEqual({
        ok: false,
        error: { code: "PARSE_ERROR", message: expect.any(String) },
      });
    });

    it("sanitizes the PARSE_ERROR message (no paths, tokens or secrets)", () => {
      const result = parseConnectedProvidersSafe("x", () => {
        throw new Error("C:\\secrets\\auth.json");
      });
      if (result.ok) throw new Error("expected error");
      expect(result.error.code).toBe("PARSE_ERROR");
      expect(result.error.message).not.toMatch(/[/\\]|key|token|secret/i);
    });
  });

  describe("getConnectedProvidersSafe", () => {
    beforeEach(() => {
      execMock.exec.mockReset();
    });

    it("invokes the exact constant command without interpolation", async () => {
      mockExecSuccess("");
      await getConnectedProvidersSafe();
      const [cmd] = execMock.exec.mock.calls[0];
      expect(cmd).toBe("opencode providers list");
    });

    it("passes a whitelisted env with HOME, USERPROFILE and PATH only", async () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        HOME: "/home/user",
        USERPROFILE: "C:\\Users\\user",
        PATH: "/usr/bin:/bin",
        OPENAI_API_KEY: "sk-secret",
      };
      try {
        mockExecSuccess("");
        await getConnectedProvidersSafe();
        const [, opts] = execMock.exec.mock.calls[0] as [string, { env: Record<string, string> }];
        expect(Object.keys(opts.env).sort()).toEqual(["HOME", "PATH", "USERPROFILE"]);
        expect(opts.env.OPENAI_API_KEY).toBeUndefined();
      } finally {
        process.env = originalEnv;
      }
    });

    it("configures a timeout and does not override the shell", async () => {
      mockExecSuccess("");
      await getConnectedProvidersSafe();
      const [, opts] = execMock.exec.mock.calls[0] as [string, { timeout: number; shell?: string }];
      expect(opts.timeout).toBe(10_000);
      // `exec` always spawns through the platform default shell; the service must
      // not override it (the installed types only allow a string shell name, and
      // forcing a boolean breaks the invocation contract on some platforms).
      expect(opts.shell).toBeUndefined();
    });

    it("returns ok with parsed providers on success", async () => {
      mockExecSuccess("●  OpenAI oauth");
      const result = await getConnectedProvidersSafe();
      expect(result).toEqual({ ok: true, value: [{ name: "OpenAI", authType: "oauth" }] });
    });

    it("returns CLI_NOT_FOUND when the CLI is missing (ENOENT)", async () => {
      mockExecFailure({ code: "ENOENT" });
      const result = await getConnectedProvidersSafe();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("CLI_NOT_FOUND");
    });

    it("returns CLI_TIMEOUT when the CLI hangs and is killed", async () => {
      mockExecFailure({ killed: true, signal: "SIGTERM", code: null });
      const result = await getConnectedProvidersSafe();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("CLI_TIMEOUT");
    });

    it("returns CLI_ERROR on a non-zero exit code", async () => {
      mockExecFailure({ code: 1, message: "command failed" });
      const result = await getConnectedProvidersSafe();
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("CLI_ERROR");
    });
  });
});