import { describe, expect, it, vi } from "vitest";

const checkGentleAiReleases = vi.fn(async () => ({
  status: { phase: "success", checkedAt: "2026-08-13T10:00:00.000Z" },
  settings: { frequencyMinutes: 60 },
  installedVersion: "1.2.0",
  channels: {
    stable: { latestVersion: "1.3.0", updateAvailable: true },
    rc: { latestVersion: "1.4.0-rc.1", updateAvailable: true },
  },
  notice: { channel: "stable", version: "1.3.0", pending: true },
}));

vi.mock("@/services/diagnosticsService", () => ({ checkGentleAiReleases }));
vi.mock("@/services/processService", () => ({ probeGentleAiVersion: vi.fn(async () => ({ ok: true, value: "1.2.0" })) }));

describe("POST /api/diagnostics/check", () => {
  it("returns persisted release state for manual checks", async () => {
    const { POST } = await import("../route");

    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notice).toEqual({ channel: "stable", version: "1.3.0", pending: true });
    expect(body.channels.rc).toEqual({ latestVersion: "1.4.0-rc.1", updateAvailable: true });
    expect(JSON.stringify(body)).not.toMatch(/[A-Z]:\\|\/Users\/|\/home\//);
  });

  it("does not start a concurrent release check", async () => {
    const { POST } = await import("../route");
    checkGentleAiReleases.mockImplementationOnce(() => new Promise((resolve) => {
      setTimeout(() => resolve({
        status: { phase: "success", checkedAt: "2026-08-13T10:00:00.000Z" },
        settings: { frequencyMinutes: 60 },
        installedVersion: "1.2.0",
        channels: { stable: { latestVersion: "1.2.0", updateAvailable: false }, rc: { latestVersion: "1.2.0-rc.1", updateAvailable: false } },
        notice: { channel: "stable", version: "1.2.0", pending: false },
      }), 20);
    }));

    const [first, second] = await Promise.all([POST(), POST()]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(202);
    await expect(second.json()).resolves.toEqual({ status: { phase: "checking", message: "Release check already in progress" } });
  });
});
