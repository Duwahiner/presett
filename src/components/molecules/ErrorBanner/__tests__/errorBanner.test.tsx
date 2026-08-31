import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBanner } from "../errorBanner";

describe("ErrorBanner", () => {
  it("renders title and message", () => {
    render(<ErrorBanner title="Oops" message="Something went wrong" />);

    expect(screen.getByText("Oops")).toBeDefined();
    expect(screen.getByText("Something went wrong")).toBeDefined();
  });

  it("renders as an alert with an icon", () => {
    render(<ErrorBanner title="Oops" message="Something went wrong" />);

    const alert = screen.getByRole("alert");
    expect(alert).toBeDefined();
    expect(alert.querySelector("svg")).toBeDefined();
  });
});
