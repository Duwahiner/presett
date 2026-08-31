import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingIndicator } from "./loadingIndicator";

describe("LoadingIndicator", () => {
  it("announces status with a live, busy status region and the label text", () => {
    render(<LoadingIndicator label="Loading…" />);

    const status = screen.getByRole("status");
    expect(status).toBeDefined();
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(status.textContent).toContain("Loading…");
  });

  it("follows the brutalist composition: square corners, explicit size, hard offset shadow, mono type", () => {
    render(<LoadingIndicator label="Cargando…" />);

    const status = screen.getByRole("status");
    expect(status.className).toContain("m-[12px]");
    expect(status.className).toContain("h-8");
    expect(status.className).toContain("w-fit");
    expect(status.className).toContain("border");
    expect(status.className).toContain("border-border");
    expect(status.className).toContain("bg-card");
    expect(status.className).toContain("text-card-foreground");
    expect(status.className).toContain("shadow-[4px_4px_0_0_var(--border)]");
    expect(status.className).toContain("font-mono");
    expect(status.className).toContain("text-xs");
    expect(status.className).toContain("font-bold");
    expect(status.className).toContain("uppercase");
    expect(status.className).toContain("tracking-wide");
    expect(status.className).toContain("gap-2");
    expect(status.className).toContain("px-3");

    // Brutalist rule: no rounded corners, no fixed px dimensions.
    expect(status.className).not.toContain("rounded");
    expect(status.className).not.toContain("min-w-40");
    expect(status.className).not.toContain("h-[25px]");
    expect(status.className).not.toContain("w-[150px]");
  });

  it("renders a visible spinner in the primary color inside the indicator", () => {
    render(<LoadingIndicator label="Loading…" />);

    const spinner = screen.getByRole("status").querySelector('[data-slot="spinner"]');
    expect(spinner).not.toBeNull();
    expect(spinner?.className).toContain("size-4");
    expect(spinner?.className).toContain("text-primary");
  });

  it("wraps in a non-blocking container that does not cover the section", () => {
    render(<LoadingIndicator label="Loading…" />);

    const wrapper = screen.getByRole("status").parentElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain("pointer-events-none");
    expect(wrapper?.className).not.toContain("absolute");
    expect(wrapper?.className).not.toContain("inset-0");
  });
});