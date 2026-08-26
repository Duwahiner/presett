import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "../route";

const collectUsageStatsMock = vi.fn();
const escapeSqlLiteralMock = vi.fn((value: string) => value);

vi.mock("@/services/usageStatsService", () => ({
  collectUsageStats: (opts: unknown) => collectUsageStatsMock(opts),
  escapeSqlLiteral: (value: string) => escapeSqlLiteralMock(value),
  clearUsageStatsCache: vi.fn(),
}));

const VALID_DATA = {
  providers: [],
  recentSessions: [],
  rangeLabel: "7d",
  generatedAt: "2026-08-26T00:00:00.000Z",
};

async function getWithQuery(query: string): Promise<{ status: number; body: unknown }> {
  const request = new Request(`http://localhost/api/usageStats${query}`);
  const response = await GET(request);
  const body = await response.json();
  return { status: response.status, body };
}

describe("GET /api/usageStats", () => {
  beforeEach(() => {
    collectUsageStatsMock.mockReset();
    escapeSqlLiteralMock.mockReset();
    escapeSqlLiteralMock.mockImplementation((value: string) => value);
  });

  it("returns 200 with usage data for valid parameters", async () => {
    collectUsageStatsMock.mockResolvedValue({ ok: true, value: VALID_DATA });

    const { status, body } = await getWithQuery("?days=7&project=/proj");

    expect(status).toBe(200);
    expect(body).toEqual(VALID_DATA);
    expect(collectUsageStatsMock).toHaveBeenCalledWith({ days: 7, project: "/proj" });
  });

  it("accepts days=0 (all) without a project", async () => {
    collectUsageStatsMock.mockResolvedValue({ ok: true, value: VALID_DATA });

    const { status } = await getWithQuery("?days=0");

    expect(status).toBe(200);
    expect(collectUsageStatsMock).toHaveBeenCalledWith({ days: 0 });
  });

  it("rejects an out-of-range days value with 400", async () => {
    const { status, body } = await getWithQuery("?days=999");

    expect(status).toBe(400);
    expect(body).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(collectUsageStatsMock).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric days value with 400", async () => {
    const { status, body } = await getWithQuery("?days=abc");

    expect(status).toBe(400);
    expect(body).toMatchObject({ error: { code: "VALIDATION_ERROR" } });
    expect(collectUsageStatsMock).not.toHaveBeenCalled();
  });

  it("rejects a missing days value with 400", async () => {
    const { status } = await getWithQuery("?project=/proj");

    expect(status).toBe(400);
    expect(collectUsageStatsMock).not.toHaveBeenCalled();
  });

  it("rejects an empty project value with 400 before invoking exec", async () => {
    const { status } = await getWithQuery("?days=7&project=");

    expect(status).toBe(400);
    expect(collectUsageStatsMock).not.toHaveBeenCalled();
  });

  it("rejects a project value longer than 512 chars with 400", async () => {
    const { status } = await getWithQuery(`?days=7&project=${"a".repeat(513)}`);

    expect(status).toBe(400);
    expect(collectUsageStatsMock).not.toHaveBeenCalled();
  });

  it("rejects a project value containing a null byte with 400 before exec", async () => {
    const { status } = await getWithQuery("?days=7&project=a%00b");

    expect(status).toBe(400);
    expect(collectUsageStatsMock).not.toHaveBeenCalled();
  });

  it("returns 503 when the CLI is unavailable", async () => {
    collectUsageStatsMock.mockResolvedValue({
      ok: false,
      error: { code: "FILE_MISSING", message: "CLI unavailable" },
    });

    const { status, body } = await getWithQuery("?days=7");

    expect(status).toBe(503);
    expect(body).toMatchObject({ error: { code: "FILE_MISSING" } });
  });

  it("returns 503 when the CLI output cannot be parsed", async () => {
    collectUsageStatsMock.mockResolvedValue({
      ok: false,
      error: { code: "PARSE_FAILED", message: "invalid json" },
    });

    const { status, body } = await getWithQuery("?days=7");

    expect(status).toBe(503);
    expect(body).toMatchObject({ error: { code: "PARSE_FAILED" } });
  });
});
