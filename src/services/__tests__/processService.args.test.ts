import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

// Shared mock so the test's assertion reference is the same function the
// module under test receives from `node:child_process`.
const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));

vi.mock("node:child_process", () => {
  return {
    default: { spawn: spawnMock },
    spawn: spawnMock,
  };
});

import { runGentleAiSync } from "@/services/processService";

function fakeChild() {
  return Object.assign(new EventEmitter(), {
    stdout: new EventEmitter(),
    stderr: new EventEmitter(),
    kill: vi.fn(),
  });
}

describe("runGentleAiSync args passthrough", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  function settle(child: EventEmitter, exitCode: number): void {
    (child as unknown as { stdout: EventEmitter }).stdout.emit(
      "data",
      Buffer.from("done"),
    );
    child.emit("close", exitCode);
  }

  it("forwards profile args as a separate array element to spawn", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    const promise = runGentleAiSync("gentle-ai", [
      "--profile",
      "cheap:anthropic/claude-haiku-3.5",
    ]);
    settle(child, 0);
    const result = await promise;

    expect(spawnMock).toHaveBeenCalledWith("gentle-ai", [
      "sync",
      "--profile",
      "cheap:anthropic/claude-haiku-3.5",
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.exitCode).toBe(0);
  });

  it("forwards phase-phase args as separate array elements", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    const promise = runGentleAiSync("gentle-ai", [
      "--profile-phase",
      "cheap:apply:anthropic/claude-sonnet-4",
    ]);
    settle(child, 0);
    const result = await promise;

    expect(spawnMock).toHaveBeenCalledWith("gentle-ai", [
      "sync",
      "--profile-phase",
      "cheap:apply:anthropic/claude-sonnet-4",
    ]);
    expect(result.ok).toBe(true);
  });

  it("runs a base sync with no extra args by default", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    const promise = runGentleAiSync("gentle-ai");
    settle(child, 0);
    const result = await promise;

    expect(spawnMock).toHaveBeenCalledWith("gentle-ai", ["sync"]);
    expect(result.ok).toBe(true);
  });

  it("surfaces a nonzero exit code when the CLI rejects the delegation", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);

    const promise = runGentleAiSync("gentle-ai", ["--profile", "bad:ref"]);
    settle(child, 1);
    const result = await promise;

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.exitCode).toBe(1);
  });
});