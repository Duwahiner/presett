import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/diagnosticsService", () => ({
  collectDiagnostics: vi.fn(async () => ({
    cli: { installed: true, version: "1.2.3" },
    config: { available: true },
    state: { available: true },
    routes: {
      config: { exists: true, readable: true, writable: true },
      state: { exists: true, readable: true, writable: true },
      backups: { exists: false, readable: false, writable: false },
    },
  })),
}));

describe("GET /api/diagnostics", () => {
  it("returns safe local diagnostics without host paths", async () => {
    const { GET } = await import("../route");

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.cli.version).toBe("1.2.3");
    expect(body.routes.config).toEqual({ exists: true, readable: true, writable: true });
    expect(JSON.stringify(body)).not.toMatch(/[A-Z]:\\|\/Users\/|\/home\//);
  });
});
