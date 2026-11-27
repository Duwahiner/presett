import { describe, it, expect } from "vitest";
import {
  activeProfileDisplayName,
  activeProfileName,
  assignmentRowLabel,
  filterAssignmentsForProfile,
  profileDefaultAgentKey,
} from "../modelsClient";

describe("activeProfileName", () => {
  it("extracts the profile name from a named orchestrator default agent", () => {
    expect(activeProfileName("sdd-orchestrator-work")).toBe("work");
  });

  it("returns an empty name for the base orchestrator", () => {
    expect(activeProfileName("gentle-orchestrator")).toBe("");
  });

  it("returns an empty name for a bare sdd-orchestrator without a profile name", () => {
    expect(activeProfileName("sdd-orchestrator")).toBe("");
  });
});

describe("filterAssignmentsForProfile", () => {
  const fullAssignments = [
    { agentKey: "gentle-orchestrator", provider: "openai", model: "gpt-4", variant: "low" },
    { agentKey: "sdd-init", provider: "openai", model: "gpt-4", variant: "low" },
    { agentKey: "sdd-apply", provider: "anthropic", model: "claude-4", variant: "standard" },
    { agentKey: "sdd-orchestrator-work", provider: "openai", model: "gpt-4", variant: "high" },
    { agentKey: "sdd-init-work", provider: "openai", model: "gpt-5", variant: "high" },
    { agentKey: "sdd-apply-work", provider: "anthropic", model: "claude-4", variant: "standard" },
    { agentKey: "sdd-orchestrator-other", provider: "google", model: "gemini-2", variant: "standard" },
    { agentKey: "sdd-init-other", provider: "google", model: "gemini-2", variant: "low" },
    { agentKey: "jd-review", provider: "openai", model: "gpt-4", variant: "high" },
  ];

  it("isolates the base profile: only gentle-orchestrator and bare phases", () => {
    const keys = filterAssignmentsForProfile(
      fullAssignments,
      "gentle-orchestrator",
    ).map((a) => a.agentKey);

    expect(keys.sort()).toEqual(["gentle-orchestrator", "sdd-apply", "sdd-init"].sort());
    expect(keys).not.toContain("sdd-orchestrator-work");
    expect(keys).not.toContain("sdd-init-work");
    expect(keys).not.toContain("sdd-orchestrator-other");
    expect(keys).not.toContain("jd-review");
  });

  it("isolates a named profile: only its orchestrator and its phases, never base or other profiles", () => {
    const keys = filterAssignmentsForProfile(
      fullAssignments,
      "sdd-orchestrator-work",
    ).map((a) => a.agentKey);

    expect(keys.sort()).toEqual(
      ["sdd-orchestrator-work", "sdd-init-work", "sdd-apply-work"].sort(),
    );
    expect(keys).not.toContain("gentle-orchestrator");
    expect(keys).not.toContain("sdd-init");
    expect(keys).not.toContain("sdd-orchestrator-other");
    expect(keys).not.toContain("sdd-init-other");
    expect(keys).not.toContain("jd-review");
  });

  it("isolates a second named profile from the first and from base", () => {
    const keys = filterAssignmentsForProfile(
      fullAssignments,
      "sdd-orchestrator-other",
    ).map((a) => a.agentKey);

    expect(keys.sort()).toEqual(["sdd-orchestrator-other", "sdd-init-other"].sort());
    expect(keys).not.toContain("sdd-orchestrator-work");
    expect(keys).not.toContain("sdd-init-work");
    expect(keys).not.toContain("gentle-orchestrator");
    expect(keys).not.toContain("jd-review");
  });

  it("keeps the internal agent key on the returned rows so saving targets the correct agent", () => {
    const result = filterAssignmentsForProfile(
      fullAssignments,
      "sdd-orchestrator-work",
    );

    expect(result.find((a) => a.agentKey === "sdd-apply-work")).toEqual({
      agentKey: "sdd-apply-work",
      provider: "anthropic",
      model: "claude-4",
      variant: "standard",
    });
  });

  it("treats an empty/undefined default agent as the base profile", () => {
    const keys = filterAssignmentsForProfile(fullAssignments, "").map(
      (a) => a.agentKey,
    );

    expect(keys.sort()).toEqual(["gentle-orchestrator", "sdd-apply", "sdd-init"].sort());
    expect(keys).not.toContain("sdd-orchestrator-work");
  });
});

describe("assignmentRowLabel", () => {
  it("returns the profile name for a named profile's orchestrator so the prefix is never shown", () => {
    expect(
      assignmentRowLabel("sdd-orchestrator-work", "sdd-orchestrator-work"),
    ).toBe("work");
  });

  it("returns the profile name verbatim for a profile named orchestrator-free", () => {
    expect(
      assignmentRowLabel(
        "sdd-orchestrator-orchestrator-free",
        "sdd-orchestrator-orchestrator-free",
      ),
    ).toBe("orchestrator-free");
  });

  it("returns undefined for phase agents and for the base orchestrator (keeps existing labels)", () => {
    expect(assignmentRowLabel("sdd-init-work", "sdd-orchestrator-work")).toBeUndefined();
    expect(assignmentRowLabel("gentle-orchestrator", "gentle-orchestrator")).toBeUndefined();
  });
});

describe("profileDefaultAgentKey", () => {
  it("maps an empty name to the base orchestrator key", () => {
    expect(profileDefaultAgentKey("")).toBe("gentle-orchestrator");
  });

  it("maps a profile name to its technical orchestrator key with a single internal prefix", () => {
    expect(profileDefaultAgentKey("orchestrator-free")).toBe(
      "sdd-orchestrator-orchestrator-free",
    );
    expect(profileDefaultAgentKey("work")).toBe("sdd-orchestrator-work");
  });
});

describe("activeProfileDisplayName", () => {
  it("returns the exact profile name for a named default agent, hiding the prefix", () => {
    expect(activeProfileDisplayName("sdd-orchestrator-orchestrator-free")).toBe(
      "orchestrator-free",
    );
    expect(activeProfileDisplayName("sdd-orchestrator-work")).toBe("work");
  });

  it("returns the base label for the base orchestrator and empty value", () => {
    expect(activeProfileDisplayName("gentle-orchestrator")).toBe("Gentle-Orchestrator");
    expect(activeProfileDisplayName("")).toBe("Gentle-Orchestrator");
  });
});