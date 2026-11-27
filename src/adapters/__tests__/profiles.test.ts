import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  listProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
  switchProfile,
  getProfileDetail,
  getBaseProfileDetail,
  updateBaseProfile,
} from "@/adapters/opencode";
import type { ModelCache } from "@/lib/validators";

vi.mock("@/services/processService", () => ({
  runGentleAiSync: vi.fn(),
}));

import { runGentleAiSync } from "@/services/processService";

const mockedRunSync = vi.mocked(runGentleAiSync);

const cache: ModelCache = {
  openai: { "gpt-4": ["low", "high"], "gpt-5": [] },
  opencode: { "qwen3-max": ["high", "max"] },
};

describe("listProfiles", () => {
  it("lists base and named profiles with active state", async () => {
    const config = {
      default_agent: "sdd-orchestrator-custom",
      agent: {
        "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
        "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "high" },
        "sdd-init-custom": { model: "openai/gpt-4", variant: "low" },
        "sdd-init": { model: "openai/gpt-4", variant: "low" },
      },
    };

    const profiles = await listProfiles(config);

    expect(profiles.map((p) => p.name)).toContain("");
    const base = profiles.find((p) => p.name === "");
    expect(base?.displayName).toBe("Gentle-Orchestrator");
    expect(profiles.map((p) => p.name)).toContain("custom");
    const custom = profiles.find((p) => p.name === "custom");
    expect(custom?.active).toBe(true);
    expect(custom?.modelCount).toBe(2);
    expect(custom?.updatedAt).toBeDefined();
    expect(typeof custom?.updatedAt).toBe("string");
  });

  it("exposes the detected strategy and per-profile incomplete status", async () => {
    const config = {
      default_agent: "gentle-orchestrator",
      agent: {
        "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
        "sdd-orchestrator-cheap": { model: "openai/gpt-4", variant: "high" },
        // A complete generated profile has all ten phase agents.
        "sdd-init-cheap": { model: "openai/gpt-4" },
        "sdd-propose-cheap": { model: "openai/gpt-4" },
        "sdd-spec-cheap": { model: "openai/gpt-4" },
        "sdd-design-cheap": { model: "openai/gpt-4" },
        "sdd-tasks-cheap": { model: "openai/gpt-4" },
        "sdd-apply-cheap": { model: "openai/gpt-4" },
        "sdd-verify-cheap": { model: "openai/gpt-4" },
        "sdd-archive-cheap": { model: "openai/gpt-4" },
        "sdd-explore-cheap": { model: "openai/gpt-4" },
        "sdd-onboard-cheap": { model: "openai/gpt-4" },
        "sdd-orchestrator-work": { model: "anthropic/claude-4" },
      },
    };

    const profiles = await listProfiles(config);

    const base = profiles.find((p) => p.name === "")!;
    expect(base.strategy).toBe("generated-multi");
    expect(base.incomplete).toBe(false);

    const complete = profiles.find((p) => p.name === "cheap")!;
    expect(complete.strategy).toBe("generated-multi");
    expect(complete.incomplete).toBe(false);

    const incomplete = profiles.find((p) => p.name === "work")!;
    expect(incomplete.strategy).toBe("generated-multi");
    expect(incomplete.incomplete).toBe(true);
  });
});

describe("createProfile", () => {
  beforeEach(() => {
    mockedRunSync.mockReset();
    mockedRunSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 0, stdout: "created", stderr: "" },
    });
  });

  it("delegates profile creation to gentle-ai sync --profile with the orchestrator ref", async () => {
    const result = await createProfile(
      "custom",
      {
        "sdd-orchestrator-custom": { provider: "openai", model: "gpt-4", variant: "low" },
      },
      cache,
    );

    expect(result.ok).toBe(true);
    expect(mockedRunSync).toHaveBeenCalledWith("gentle-ai", [
      "--profile",
      "custom:openai/gpt-4",
    ]);
  });

  it("rejects a legacy phase agent key in assignments with SCHEMA_INVALID and never delegates", async () => {
    const result = await createProfile(
      "custom",
      {
        "sdd-orchestrator-custom": { provider: "openai", model: "gpt-4", variant: "low" },
        "sdd-init-custom": { provider: "openai", model: "gpt-4", variant: "high" },
      },
      cache,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("rejects the reserved name 'base' with SCHEMA_INVALID and never delegates", async () => {
    const result = await createProfile(
      "base",
      {
        "sdd-orchestrator-base": { provider: "openai", model: "gpt-4", variant: "low" },
      },
      cache,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("rejects a name starting with the internal sdd-orchestrator- prefix (double-prefix guard)", async () => {
    const result = await createProfile(
      "sdd-orchestrator-free",
      {
        "sdd-orchestrator-sdd-orchestrator-free": {
          provider: "openai",
          model: "gpt-4",
          variant: "low",
        },
      },
      cache,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");
    // The internal prefix must never be accepted as an input profile name.
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("preserves a plain name verbatim — 'orchestrator-free' is kept exactly and never prefixed twice", async () => {
    const result = await createProfile(
      "orchestrator-free",
      {
        "sdd-orchestrator-orchestrator-free": {
          provider: "openai",
          model: "gpt-4",
          variant: "low",
        },
      },
      cache,
    );

    expect(result.ok).toBe(true);
    expect(mockedRunSync).toHaveBeenCalledWith("gentle-ai", [
      "--profile",
      "orchestrator-free:openai/gpt-4",
    ]);
  });

  it("rejects an invalid profile name before delegating (argument-injection guard)", async () => {
    const result = await createProfile(
      "../../evil",
      {
        "sdd-orchestrator-../../evil": { provider: "openai", model: "gpt-4", variant: "low" },
      },
      cache,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("delegates an `opencode` provider verbatim as `name:opencode/<model>`", async () => {
    const result = await createProfile(
      "zen",
      {
        "sdd-orchestrator-zen": { provider: "opencode", model: "qwen3-max", variant: "high" },
      },
      cache,
    );

    expect(result.ok).toBe(true);
    expect(mockedRunSync).toHaveBeenCalledWith("gentle-ai", [
      "--profile",
      "zen:opencode/qwen3-max",
    ]);
  });

  it("rejects a model not in the catalog before delegating", async () => {
    const result = await createProfile(
      "custom",
      {
        "sdd-orchestrator-custom": { provider: "openai", model: "gpt-99", variant: "low" },
      },
      cache,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("surfaces a CLI failure via the SyncResult exit code", async () => {
    mockedRunSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 1, stdout: "", stderr: "rejected" },
    });

    const result = await createProfile(
      "custom",
      {
        "sdd-orchestrator-custom": { provider: "openai", model: "gpt-4", variant: "low" },
      },
      cache,
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.exitCode).toBe(1);
  });
});

describe("updateProfile", () => {
  beforeEach(() => {
    mockedRunSync.mockReset();
    mockedRunSync.mockResolvedValue({
      ok: true,
      value: { exitCode: 0, stdout: "updated", stderr: "" },
    });
  });

  it("delegates an orchestrator update to gentle-ai sync --profile with the CLI ref", async () => {
    const result = await updateProfile(
      "zen",
      {
        "sdd-orchestrator-zen": { provider: "opencode", model: "qwen3-max", variant: "max" },
      },
      cache,
    );

    expect(result.ok).toBe(true);
    expect(mockedRunSync).toHaveBeenCalledWith("gentle-ai", [
      "--profile",
      "zen:opencode/qwen3-max",
    ]);
  });

  it("ignores legacy phase agent keys and delegates only the orchestrator assignment", async () => {
    const result = await updateProfile(
      "work",
      {
        "sdd-orchestrator-work": { provider: "openai", model: "gpt-4", variant: "high" },
        "sdd-init-work": { provider: "openai", model: "gpt-4", variant: "high" },
      },
      cache,
    );

    expect(result.ok).toBe(true);
    expect(mockedRunSync).toHaveBeenCalledWith("gentle-ai", [
      "--profile",
      "work:openai/gpt-4",
    ]);
  });

  it("rejects an invalid profile name before delegating", async () => {
    const result = await updateProfile(
      "../../evil",
      {
        "sdd-orchestrator-../../evil": { provider: "openai", model: "gpt-4", variant: "low" },
      },
      cache,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });

  it("rejects a model not in the catalog before delegating", async () => {
    const result = await updateProfile(
      "work",
      {
        "sdd-orchestrator-work": { provider: "openai", model: "gpt-99", variant: "high" },
      },
      cache,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");
    expect(mockedRunSync).not.toHaveBeenCalled();
  });
});

describe("deleteProfile", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-profile-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("removes profile agent entries", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          "sdd-orchestrator-custom": { model: "x/y" },
          "sdd-init-custom": { model: "x/y" },
        },
      }),
    );

    const result = await deleteProfile(tempDir, "custom", join(tempDir, "backups"));

    expect(result.ok).toBe(true);
    const written = JSON.parse(
      await readFile(join(tempDir, "opencode.json"), "utf-8"),
    );
    expect(written.agent["sdd-orchestrator-custom"]).toBeUndefined();
    expect(written.agent["sdd-init-custom"]).toBeUndefined();
  });

  it("rejects deletion of the base profile", async () => {
    await writeFile(join(tempDir, "opencode.json"), JSON.stringify({ agent: {} }));

    const result = await deleteProfile(tempDir, "", join(tempDir, "backups"));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");
  });

  it("rejects deletion of the reserved name 'base' without modifying the config", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        default_agent: "gentle-orchestrator",
        agent: {
          "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
          "sdd-orchestrator-base": { model: "openai/gpt-4", variant: "high" },
        },
      }),
    );

    const result = await deleteProfile(tempDir, "base", join(tempDir, "backups"));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");

    // The reserved profile must not be touched.
    const written = JSON.parse(
      await readFile(join(tempDir, "opencode.json"), "utf-8"),
    );
    expect(written.agent["sdd-orchestrator-base"]).toBeDefined();
    expect(written.agent["gentle-orchestrator"]).toBeDefined();
  });

  it("restores default_agent to gentle-orchestrator when deleting the active profile", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        default_agent: "sdd-orchestrator-custom",
        agent: {
          "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
          "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "high" },
          "sdd-init-custom": { model: "openai/gpt-4", variant: "low" },
          "sdd-orchestrator-other": { model: "anthropic/claude-4", variant: "standard" },
        },
      }),
    );

    const result = await deleteProfile(tempDir, "custom", join(tempDir, "backups"));

    expect(result.ok).toBe(true);
    const written = JSON.parse(
      await readFile(join(tempDir, "opencode.json"), "utf-8"),
    );
    // The deleted profile was active, so default_agent must be restored.
    expect(written.default_agent).toBe("gentle-orchestrator");
    // The profile's agents are removed while other profiles are preserved.
    expect(written.agent["sdd-orchestrator-custom"]).toBeUndefined();
    expect(written.agent["sdd-init-custom"]).toBeUndefined();
    expect(written.agent["sdd-orchestrator-other"]).toEqual({
      model: "anthropic/claude-4",
      variant: "standard",
    });
    expect(written.agent["gentle-orchestrator"]).toBeDefined();
  });

  it("leaves default_agent unchanged when deleting an inactive profile", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        default_agent: "sdd-orchestrator-other",
        agent: {
          "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "high" },
          "sdd-orchestrator-other": { model: "anthropic/claude-4", variant: "standard" },
        },
      }),
    );

    const result = await deleteProfile(tempDir, "custom", join(tempDir, "backups"));

    expect(result.ok).toBe(true);
    const written = JSON.parse(
      await readFile(join(tempDir, "opencode.json"), "utf-8"),
    );
    expect(written.default_agent).toBe("sdd-orchestrator-other");
    expect(written.agent["sdd-orchestrator-custom"]).toBeUndefined();
    expect(written.agent["sdd-orchestrator-other"]).toBeDefined();
  });
});

describe("switchProfile", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-profile-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("sets default_agent to the profile orchestrator", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        default_agent: "gentle-orchestrator",
        agent: {
          "sdd-orchestrator-custom": { model: "x/y" },
        },
      }),
    );

    const result = await switchProfile(tempDir, "custom", join(tempDir, "backups"));

    expect(result.ok).toBe(true);
    const written = JSON.parse(
      await readFile(join(tempDir, "opencode.json"), "utf-8"),
    );
    expect(written.default_agent).toBe("sdd-orchestrator-custom");
  });
});

describe("getProfileDetail", () => {
  it("returns only the orchestrator assignment for a named profile", () => {
    const config = {
      agent: {
        "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "high" },
        "sdd-init-custom": { model: "anthropic/claude-4", variant: "standard" },
      },
    };

    const detail = getProfileDetail(config, "custom");

    expect(detail).not.toBeNull();
    expect(detail!.name).toBe("custom");
    expect(detail!.assignments["sdd-orchestrator-custom"]).toEqual({
      provider: "openai",
      model: "gpt-4",
      variant: "high",
    });
    // Legacy phase assignments must not surface in the detail contract.
    expect(detail!.assignments["sdd-init-custom"]).toBeUndefined();
  });

  it("preserves assignments whose model is outside the active catalog", () => {
    const config = {
      agent: {
        "sdd-orchestrator-custom": { model: "acme/legacy-model", variant: "legacy" },
      },
    };

    const detail = getProfileDetail(config, "custom");

    expect(detail!.assignments["sdd-orchestrator-custom"]).toEqual({
      provider: "acme",
      model: "legacy-model",
      variant: "legacy",
    });
  });

  it("returns null for a nonexistent profile", () => {
    const config = {
      agent: { "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" } },
    };

    expect(getProfileDetail(config, "missing")).toBeNull();
  });

  it("returns null for an invalid profile name (path traversal)", () => {
    const config = { agent: {} };

    expect(getProfileDetail(config, "../../etc/passwd")).toBeNull();
  });
});

describe("getBaseProfileDetail", () => {
  it("returns the empty-name identity with the orchestrator and non-profile agents", () => {
    const config = {
      default_agent: "gentle-orchestrator",
      agent: {
        "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
        "sdd-init": { model: "anthropic/claude-4", variant: "standard" },
        "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "high" },
        "sdd-init-custom": { model: "openai/gpt-4", variant: "low" },
      },
    };

    const detail = getBaseProfileDetail(config);

    expect(detail.name).toBe("");
    expect(detail.assignments["gentle-orchestrator"]).toEqual({
      provider: "openai",
      model: "gpt-4",
      variant: "low",
    });
    expect(detail.assignments["sdd-init"]).toEqual({
      provider: "anthropic",
      model: "claude-4",
      variant: "standard",
    });
  });

  it("excludes named-profile agents from the base assignment set", () => {
    const config = {
      agent: {
        "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
        "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "high" },
        "sdd-init-custom": { model: "openai/gpt-4", variant: "low" },
      },
    };

    const detail = getBaseProfileDetail(config);

    expect(detail.assignments["sdd-orchestrator-custom"]).toBeUndefined();
    expect(detail.assignments["sdd-init-custom"]).toBeUndefined();
    expect(detail.assignments["gentle-orchestrator"]).toEqual({
      provider: "openai",
      model: "gpt-4",
      variant: "low",
    });
  });
});

describe("updateBaseProfile", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-profile-base-update-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("persists the base (non-profile) assignment into opencode.json", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" } },
      }),
    );

    const result = await updateBaseProfile(
      tempDir,
      {
        "gentle-orchestrator": { provider: "openai", model: "gpt-4", variant: "high" },
      },
      join(tempDir, "backups"),
      cache,
    );

    expect(result.ok).toBe(true);
    const written = JSON.parse(
      await readFile(join(tempDir, "opencode.json"), "utf-8"),
    );
    expect(written.agent["gentle-orchestrator"].variant).toBe("high");
  });

  it("persists an `opencode` base assignment directly as the CLI ref `opencode/<model>`", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: { "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" } },
      }),
    );

    const result = await updateBaseProfile(
      tempDir,
      {
        "gentle-orchestrator": { provider: "opencode", model: "qwen3-max", variant: "high" },
      },
      join(tempDir, "backups"),
      cache,
    );

    expect(result.ok).toBe(true);
    const written = JSON.parse(
      await readFile(join(tempDir, "opencode.json"), "utf-8"),
    );
    expect(written.agent["gentle-orchestrator"].model).toBe("opencode/qwen3-max");
    expect(written.agent["gentle-orchestrator"].model).not.toContain("opencode-zen");
  });

  it("rejects a named-profile agent key and does not mutate that named profile", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({
        agent: {
          "gentle-orchestrator": { model: "openai/gpt-4", variant: "low" },
          "sdd-orchestrator-custom": { model: "openai/gpt-4", variant: "low" },
        },
      }),
    );

    const result = await updateBaseProfile(
      tempDir,
      {
        "sdd-orchestrator-custom": { provider: "openai", model: "gpt-4", variant: "high" },
      },
      join(tempDir, "backups"),
      cache,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("SCHEMA_INVALID");

    // The named profile must be left untouched.
    const written = JSON.parse(
      await readFile(join(tempDir, "opencode.json"), "utf-8"),
    );
    expect(written.agent["sdd-orchestrator-custom"].variant).toBe("low");
  });
});
