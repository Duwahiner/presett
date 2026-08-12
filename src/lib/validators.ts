import { z } from "zod";
import type { Result } from "@/lib/types";
import { err, ok } from "@/lib/types";
import type { OpenCodeConfig } from "@/types";

export const openCodeAgentEntrySchema = z.object({
  description: z.string().optional(),
  mode: z.string().optional(),
  model: z.string().optional(),
  variant: z.string().optional(),
  prompt: z.string().optional(),
  tools: z.unknown().optional(),
  permission: z.unknown().optional(),
});

export const openCodeConfigSchema = z
  .object({
    $schema: z.string().optional(),
    default_agent: z.string().optional(),
    agent: z.record(z.string(), openCodeAgentEntrySchema),
    mcp: z.unknown().optional(),
    permission: z.unknown().optional(),
    plugin: z.array(z.unknown()).optional(),
    share: z.string().optional(),
    theme: z.string().optional(),
  })
  .passthrough();

export function parseOpenCodeConfigSafe(raw: string): Result<OpenCodeConfig> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    return err({
      code: "PARSE_FAILED",
      message: "opencode.json could not be parsed as JSON",
      cause,
    });
  }

  const result = openCodeConfigSchema.safeParse(parsed);
  if (!result.success) {
    return err({
      code: "SCHEMA_INVALID",
      message: result.error.message,
      cause: result.error,
    });
  }

  return ok(result.data as OpenCodeConfig);
}

export type ModelCache = Record<string, Record<string, string[]>>;

export interface ModelCacheIndex {
  isEmpty(): boolean;
  hasProvider(provider: string): boolean;
  hasModel(provider: string, model: string): boolean;
  getVariants(provider: string, model: string): string[];
}

export function buildModelCache(raw: ModelCache): ModelCacheIndex {
  return {
    isEmpty(): boolean {
      return Object.keys(raw).length === 0;
    },
    hasProvider(provider: string): boolean {
      return Object.prototype.hasOwnProperty.call(raw, provider);
    },
    hasModel(provider: string, model: string): boolean {
      return Object.prototype.hasOwnProperty.call(raw[provider] ?? {}, model);
    },
    getVariants(provider: string, model: string): string[] {
      return raw[provider]?.[model] ?? [];
    },
  };
}

export interface ModelAssignmentInput {
  provider: string;
  model: string;
  variant: string;
}

export function validateModelAssignment(
  cache: ModelCacheIndex,
  input: ModelAssignmentInput,
): Result<void> {
  if (cache.isEmpty()) {
    return err({
      code: "WRITE_BLOCKED",
      message: "Model catalog is empty or unavailable; writes are blocked",
    });
  }

  if (!cache.hasProvider(input.provider)) {
    return err({
      code: "SCHEMA_INVALID",
      message: `Provider "${input.provider}" is not in the model catalog`,
    });
  }

  if (!cache.hasModel(input.provider, input.model)) {
    return err({
      code: "SCHEMA_INVALID",
      message: `Model "${input.model}" is not available for provider "${input.provider}"`,
    });
  }

  const variants = cache.getVariants(input.provider, input.model);
  if (!variants.includes(input.variant)) {
    return err({
      code: "SCHEMA_INVALID",
      message: `Variant "${input.variant}" is not valid for ${input.provider}/${input.model}`,
    });
  }

  return ok(undefined);
}
