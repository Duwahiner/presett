import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge primitive", () => {
  it.each([
    ["default", "Default badge"],
    ["secondary", "Secondary badge"],
    ["destructive", "Destructive badge"],
    ["outline", "Outline badge"],
  ] as const)("renders the %s variant", (variant, label) => {
    render(<Badge variant={variant}>{label}</Badge>);
    expect(screen.getByText(label)).not.toBeNull();
  });
});
