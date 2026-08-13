import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SearchPage from "../page";

vi.mock("@/components/organisms/SearchClient/SearchClient", () => ({
  SearchClient: () => <div data-testid="search-client" />,
}));

describe("SearchPage", () => {
  it("renders the global search heading and client", () => {
    render(<SearchPage />);

    expect(screen.getByRole("heading", { name: "Global search" })).not.toBeNull();
    expect(screen.getByTestId("search-client")).not.toBeNull();
  });
});
