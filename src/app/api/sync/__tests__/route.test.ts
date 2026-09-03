import { describe, it, expect } from "vitest";
import { OPTIONS, POST } from "../route";

function mutationRequest(origin?: string): Request {
  const request = new Request("http://localhost/api/sync", { method: "POST" });
  if (origin) request.headers.set("Origin", origin);
  return request;
}

function commandFailureRequest(): Request {
  return new Request("http://localhost/api/sync", {
    method: "POST",
  });
}

describe("POST /api/sync", () => {
  it("rejects missing Origin before running sync", async () => {
    process.env.PRESETT_TEST_SYNC_COMMAND = "missing-command-xyz";
    const response = await POST(mutationRequest());
    delete process.env.PRESETT_TEST_SYNC_COMMAND;

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { message: "Forbidden local API origin" },
    });
  });

  it("rejects non-loopback Origin before running sync", async () => {
    process.env.PRESETT_TEST_SYNC_COMMAND = "missing-command-xyz";
    const response = await POST(mutationRequest("http://evil.test"));
    delete process.env.PRESETT_TEST_SYNC_COMMAND;

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: { message: "Forbidden local API origin" },
    });
  });

  it("allows OPTIONS preflight without origin enforcement", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("OPTIONS, POST");
  });

  it("returns error when gentle-ai is missing", async () => {
    process.env.PRESETT_TEST_SYNC_COMMAND = "missing-command-xyz";
    const request = commandFailureRequest();
    request.headers.set("Origin", "http://localhost:5173");
    const response = await POST(request);
    delete process.env.PRESETT_TEST_SYNC_COMMAND;

    expect(response.status).toBe(503);
  });

  it("returns an error when gentle-ai exits unsuccessfully", async () => {
    process.env.PRESETT_TEST_SYNC_COMMAND = "node";
    const request = commandFailureRequest();
    request.headers.set("Origin", "http://localhost:5173");
    const response = await POST(request);
    delete process.env.PRESETT_TEST_SYNC_COMMAND;

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: { message: "Gentle-AI sync failed" },
    });
  });
});
