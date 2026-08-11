import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardLayout } from "@/components/organisms/DashboardLayout/DashboardLayout";
import { setLocale } from "@/resources/resources";

const mockPathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

vi.mock("next/link", () => ({
  default ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    return <a href={href} {...rest}>{children}</a>;
  },
}));

describe("DashboardLayout", () => {
  beforeEach(() => {
    setLocale("en");
    mockPathname.mockReturnValue("/");
  });

  it("renders navigation links and children", () => {
    render(
      <DashboardLayout>
        <main>
          <h1>Dashboard content</h1>
        </main>
      </DashboardLayout>,
    );

    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Models" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Profiles" })).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Backups" })).not.toBeNull();
    expect(screen.queryByText("Dashboard content")).not.toBeNull();
  });

  it("renders the topbar with theme toggle", () => {
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    expect(screen.getByRole("searchbox")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: /toggle theme/i }),
    ).not.toBeNull();
  });

  it("highlights the active route in the sidebar", () => {
    mockPathname.mockReturnValue("/models");
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    const modelsLink = screen.getByRole("link", { name: "Models" });
    expect(modelsLink.getAttribute("aria-current")).toBe("page");
  });

  it("renders Spanish navigation when locale is es", () => {
    setLocale("es");
    render(
      <DashboardLayout>
        <main>Child</main>
      </DashboardLayout>,
    );

    expect(screen.getByRole("link", { name: "Panel de control" })).not.toBeNull();
    expect(screen.getByRole("link", { name: "Modelos" })).not.toBeNull();
  });
});
