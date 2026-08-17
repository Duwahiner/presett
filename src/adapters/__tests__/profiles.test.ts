import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  listProfiles,
  createProfile,
  deleteProfile,
  switchProfile,
} from "@/adapters/opencode";
import type { ModelCache } from "@/lib/validators";

const cache: ModelCache = {
  openai: { "gpt-4": ["low", "high"] },
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
    expect(profiles.map((p) => p.name)).toContain("custom");
    const custom = profiles.find((p) => p.name === "custom");
    expect(custom?.active).toBe(true);
    expect(custom?.modelCount).toBe(2);
    expect(custom?.updatedAt).toBeDefined();
    expect(typeof custom?.updatedAt).toBe("string");
  });
});

describe("createProfile", () => {
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "presett-profile-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("adds profile agent entries to opencode.json", async () => {
    await writeFile(
      join(tempDir, "opencode.json"),
      JSON.stringify({ agent: {} }),
    );

    const result = await createProfile(
      tempDir,
      "custom",
      {
        "sdd-orchestrator-custom": { provider: "openai", model: "gpt-4", variant: "low" },
        "sdd-init-custom": { provider: "openai", model: "gpt-4", variant: "high" },
      },
      join(tempDir, "backups"),
      cache,
    );

    expect(result.ok).toBe(true);
    const written = JSON.parse(
      await readFile(join(tempDir, "opencode.json"), "utf-8"),
    );
    expect(written.agent["sdd-orchestrator-custom"].model).toBe("openai/gpt-4");
    expect(written.agent["sdd-init-custom"].variant).toBe("high");
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
