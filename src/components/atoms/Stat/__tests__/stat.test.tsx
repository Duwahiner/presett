import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stat } from "@/components/atoms/Stat/stat";
import { Cpu } from "lucide-react";

describe("Stat", () => {
  it("renders label, value, and icon", () => {
    render(<Stat label="Models" value="12" icon={Cpu} />);

    expect(screen.getByText("Models")).not.toBeNull();
    expect(screen.getByText("12")).not.toBeNull();
    expect(document.querySelector("svg")).not.toBeNull();
  });

  it("renders trend when provided", () => {
    render(
      <Stat label="Models" value="12" icon={Cpu} trend={{ value: "+2", positive: true }} />,
    );

    expect(screen.getByText("+2")).not.toBeNull();
  });

  it("does not render trend when not provided", () => {
    render(<Stat label="Models" value="12" icon={Cpu} />);

    expect(screen.queryByText("+2")).toBeNull();
  });

  it("merges custom className on the root card", () => {
    render(<Stat label="Models" value="12" icon={Cpu} className="my-stat" />);

    const root = screen.getByText("Models").closest(".my-stat");
    expect(root).not.toBeNull();
  });
});
