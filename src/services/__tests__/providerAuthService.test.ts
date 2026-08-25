import { describe, it, expect } from "vitest";
import { parseConnectedProviders, normalizeProviderName } from "../providerAuthService";

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
});
