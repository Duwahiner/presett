import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchClient } from "../searchClient";
import { searchEntities } from "@/services/searchApiService";

const mockSearchParams = vi.fn(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams(),
}));

vi.mock("next/link", () => ({
  default ({ children, href, ...rest }: { children: React.ReactNode; href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    return <a href={href} {...rest}>{children}</a>;
  },
}));

vi.mock("@/services/searchApiService", () => ({
  searchEntities: vi.fn(),
}));

describe("SearchClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.mockReturnValue(new URLSearchParams());
  });

  it("shows instructions without querying when the URL query is empty", () => {
    render(<SearchClient />);

    expect(screen.getByRole("heading", { name: "Search everything in PreSett" })).not.toBeNull();
    expect(screen.getByText("Search agents, models, profiles, backups, and safe configuration fields."));
    expect(searchEntities).not.toHaveBeenCalled();
  });

  it("loads and groups results from the API client", async () => {
    mockSearchParams.mockReturnValue(new URLSearchParams("q=claude"));
    vi.mocked(searchEntities).mockResolvedValue({
      query: "claude",
      total: 2,
      warnings: ["models"],
      results: [
        { type: "agent", id: "claude", label: "claude", subtitle: "anthropic/claude", href: "/models?agent=claude" },
        { type: "backup", id: "backup-1", label: "backup-1", subtitle: "gentle", href: "/backups?backup=backup-1", pinned: true },
      ],
    });

    render(<SearchClient />);

    expect(screen.getByRole("status").textContent).toContain("Searching");
    expect(await screen.findByRole("heading", { name: "Agents" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Backups" })).not.toBeNull();
    expect(screen.getByRole("link", { name: /claude/i }).getAttribute("href")).toBe("/models?agent=claude");
    expect(screen.getByText("Some search sources were unavailable: models."));
    expect(document.body.textContent).not.toMatch(/prompt|permission|mcp|C:\\|\/Users\//i);
  });

  it("shows no-results feedback without rendering a duplicate search form", async () => {
    mockSearchParams.mockReturnValue(new URLSearchParams("q=missing"));
    vi.mocked(searchEntities).mockResolvedValue({ query: "missing", total: 0, results: [] });

    render(<SearchClient />);

    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("No results found for \"missing\"."));
    expect(screen.queryByRole("searchbox", { name: "Search query" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Search" })).toBeNull();
  });

  it("shows an accessible error when the API client fails", async () => {
    mockSearchParams.mockReturnValue(new URLSearchParams("q=agent"));
    vi.mocked(searchEntities).mockRejectedValue(new Error("Search service unavailable"));

    render(<SearchClient />);

    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Search service unavailable"));
    expect(screen.queryByRole("searchbox", { name: "Search query" })).toBeNull();
  });
});
