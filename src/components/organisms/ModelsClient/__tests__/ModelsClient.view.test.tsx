import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModelsClientView } from "../ModelsClient.view";
import { setLocale } from "@/resources/resources";
import type { ModelsClientViewProps } from "../ModelsClient.types";

describe("ModelsClientView", () => {
  beforeEach(() => {
    setLocale("en");
  });

  const defaultProps: ModelsClientViewProps = {
    assignments: [],
    catalog: { openai: { "gpt-5": ["high"] } },
    loading: false,
    error: null,
    saving: null,
    profiles: [],
    activeProfile: "default",
    syncing: false,
    switchingProfile: false,
    resetting: false,
    onSave: vi.fn(),
    onSwitchProfile: vi.fn(),
    onSync: vi.fn(),
    onReset: vi.fn(),
  };

  it("renders a meaningful empty state when no assignments exist", () => {
    render(<ModelsClientView {...defaultProps} />);

    expect(screen.getByText("No agent assignments found")).not.toBeNull();
    expect(screen.getByText(/sync configs or create/i)).not.toBeNull();
  });

  it("does not render inline mutation feedback", () => {
    render(<ModelsClientView {...defaultProps} />);

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
