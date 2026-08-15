import { beforeEach, describe, expect, it, vi } from "vitest";
import { get } from "@/services/api";
import { searchEntities } from "../searchApiService";

vi.mock("@/services/api", () => ({
  get: vi.fn(),
}));

describe("searchApiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests encoded global search results with the provided limit", async () => {
    vi.mocked(get).mockResolvedValue({ results: [], total: 0, query: "claude sonnet" });

    await expect(searchEntities("claude sonnet", 12)).resolves.toEqual({
      results: [],
      total: 0,
      query: "claude sonnet",
    });

    expect(get).toHaveBeenCalledWith("/search?q=claude+sonnet&limit=12");
  });

  it("omits the limit when it is not provided", async () => {
    vi.mocked(get).mockResolvedValue({ results: [], total: 0, query: "backup" });

    await searchEntities("backup");

    expect(get).toHaveBeenCalledWith("/search?q=backup");
  });
});
