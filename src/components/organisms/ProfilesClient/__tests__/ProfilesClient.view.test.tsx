import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfilesClientView } from "../ProfilesClient.view";
import { setLocale } from "@/resources/resources";
import type { ProfilesClientViewProps } from "../ProfilesClient.types";

describe("ProfilesClientView", () => {
  beforeEach(() => {
    setLocale("en");
  });

  const defaultProps: ProfilesClientViewProps = {
    profiles: [],
    catalog: {},
    loading: false,
    error: null,
    newName: "",
    newAssignments: {},
    onNewNameChange: vi.fn(),
    onAssignmentChange: vi.fn(),
    onCreate: vi.fn(),
    onSwitch: vi.fn(),
    onDelete: vi.fn(),
    editingProfile: null,
    editAssignments: {},
    onEditStart: vi.fn(),
    onEditSave: vi.fn(),
    onEditCancel: vi.fn(),
    onEditAssignmentChange: vi.fn(),
  };

  function StatefulView(
    props: Partial<Omit<ProfilesClientViewProps, "newName" | "onNewNameChange">>,
  ) {
    const [newName, setNewName] = useState("");
    return (
      <ProfilesClientView
        {...defaultProps}
        {...props}
        newName={newName}
        onNewNameChange={setNewName}
      />
    );
  }

  it("renders the create profile button", () => {
    render(<ProfilesClientView {...defaultProps} />);

    expect(screen.getByText("Create Profile")).not.toBeNull();
  });

  it("shows form and input when clicking create button", async () => {
    render(<StatefulView />);

    await userEvent.click(screen.getByText("Create Profile"));

    expect(screen.queryByPlaceholderText("Profile name")).not.toBeNull();
  });

  it("updates the input value when typing", async () => {
    render(<StatefulView />);

    await userEvent.click(screen.getByText("Create Profile"));
    await userEvent.type(screen.getByPlaceholderText("Profile name"), "work");

    const input = screen.getByPlaceholderText("Profile name") as HTMLInputElement;
    expect(input.value).toBe("work");
  });
});
