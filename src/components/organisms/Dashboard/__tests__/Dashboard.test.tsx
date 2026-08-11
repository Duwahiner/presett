import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "@/components/organisms/Dashboard/Dashboard";

vi.mock("next/link", () => ({
  default ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  },
}));

describe("Dashboard", () => {
  it("renders status heading and placeholder cards", () => {
    render(<Dashboard />);

    expect(screen.queryByText("PreSett Dashboard")).not.toBeNull();
    expect(screen.queryByText("Models")).not.toBeNull();
    expect(screen.queryByText("Profiles")).not.toBeNull();
    expect(screen.queryByText("Backups")).not.toBeNull();
  });

  it("renders links to each placeholder page", () => {
    render(<Dashboard />);

    expect(screen.queryByRole("link", { name: /manage models/i })).not.toBeNull();
    expect(screen.queryByRole("link", { name: /manage profiles/i })).not.toBeNull();
    expect(screen.queryByRole("link", { name: /view backups/i })).not.toBeNull();
  });
});
