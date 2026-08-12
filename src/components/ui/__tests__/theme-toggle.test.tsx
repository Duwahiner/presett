import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const setTheme = vi.fn();
let currentTheme = "light";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: currentTheme,
    setTheme,
  }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    setTheme.mockClear();
    currentTheme = "light";
  });

  it("renders a theme toggle button", () => {
    render(<ThemeToggle />);

    expect(
      screen.getByRole("button", { name: /toggle theme/i }),
    ).not.toBeNull();
  });

  it("switches to dark when clicked in light mode", () => {
    currentTheme = "light";
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: /toggle theme/i }));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("switches to light when clicked in dark mode", () => {
    currentTheme = "dark";
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole("button", { name: /toggle theme/i }));
    expect(setTheme).toHaveBeenCalledWith("light");
  });
});
