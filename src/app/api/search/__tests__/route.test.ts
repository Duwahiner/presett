import { describe, expect, it, vi } from "vitest";

vi.mock("@/services/searchService", () => ({
  searchEntities: vi.fn(async ({ query, limit }) => ({
    results: query
      ? [{ type: "agent", id: "claude", label: "claude", href: "/models?agent=claude" }]
      : [],
    total: query ? 1 : 0,
    query,
    warnings: limit === 5 ? ["models"] : undefined,
  })),
}));

describe("GET /api/search", () => {
  it("returns search results for a valid query and limit", async () => {
    const { GET } = await import("../route");

    const response = await GET(new Request("http://localhost/api/search?q=claude&limit=5"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      total: 1,
      query: "claude",
      warnings: ["models"],
    });
    expect(body.results[0]).toEqual({
      type: "agent",
      id: "claude",
      label: "claude",
      href: "/models?agent=claude",
    });
  });

  it("returns an empty response for missing query", async () => {
    const { GET } = await import("../route");

    const response = await GET(new Request("http://localhost/api/search"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ results: [], total: 0, query: "" });
  });

  it("rejects an invalid limit without exposing internals", async () => {
    const { GET } = await import("../route");

    const response = await GET(new Request("http://localhost/api/search?q=claude&limit=zero"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: { message: "Invalid search limit" } });
  });
});
