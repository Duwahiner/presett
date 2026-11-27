import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { NotificationProvider } from "@/contexts/notificationContext";
import { AuditModeProvider } from "@/lib/visual-audit/auditContext";
import { ProfilesClient } from "../profilesClient";
import type { ProfilesClientViewProps } from "../profilesClientTypes";

vi.mock("@/components/organisms/ProfilesClient/profilesClientView", () => ({
  ProfilesClientView: (props: ProfilesClientViewProps) => (
    <>
      <button type="button" onClick={() => props.onAssignmentChange("orchestrator", {
        provider: "openai",
        model: "gpt-4",
        variant: "high",
      })}>
        Assign orchestrator
      </button>
      <span data-testid="has-create-handler">{String("onCreate" in props && props.onCreate !== undefined)}</span>
      <span data-testid="has-repair-handlers">
        {String(
          "onRepairStart" in props ||
            "onRepairConfirm" in props ||
            "onRepairCancel" in props ||
            "repairConfirmProfile" in props,
        )}
      </span>
      <span data-testid="new-assignments">
        {JSON.stringify(props.newAssignments)}
      </span>
      <button type="button" onClick={() => props.onEditStart("work")}>
        Start update
      </button>
      <button type="button" onClick={() => props.onEditStart("")}>
        Start base update
      </button>
      <button type="button" onClick={() => props.onDeleteStart("work")}>
        Start delete
      </button>
      <button type="button" onClick={() => props.onDeleteConfirm()}>
        Confirm delete
      </button>
      <span data-testid="pending-action">{props.pendingAction ?? ""}</span>
      {props.editingProfile !== null && (
        <>
          <button type="button" onClick={() => props.onEditSave()}>
            Update profile
          </button>
          <button type="button" onClick={() => props.onEditCancel()}>
            Cancel update
          </button>
          <span data-testid="edit-assignments">
            {JSON.stringify(props.editAssignments)}
          </span>
          <span data-testid="detail-loading">
            {String(props.detailLoading)}
          </span>
          <span data-testid="detail-error">{props.detailError ?? ""}</span>
        </>
      )}
    </>
  ),
}));

const {
  listProfiles,
  createProfile,
  switchProfile,
  deleteProfile,
  updateProfile,
  getProfileDetail,
  repairProfile,
} = vi.hoisted(() => ({
  listProfiles: vi.fn(),
  createProfile: vi.fn(),
  switchProfile: vi.fn(),
  deleteProfile: vi.fn(),
  updateProfile: vi.fn(),
  getProfileDetail: vi.fn(),
  repairProfile: vi.fn(),
}));

vi.mock("@/services/profilesApiService", () => ({
  listProfiles,
  createProfile,
  switchProfile,
  deleteProfile,
  updateProfile,
  getProfileDetail,
  repairProfile,
}));

const WORK_DETAIL = {
  name: "work",
  assignments: {
    "sdd-orchestrator-work": {
      provider: "openai",
      model: "gpt-4",
      variant: "high",
    },
  },
};

function wrapper({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  listProfiles.mockResolvedValue({
    profiles: [
      {
        name: "work",
        displayName: "Work",
        active: false,
        modelCount: 2,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  });
  updateProfile.mockResolvedValue(undefined);
});

describe("ProfilesClient edit hydration", () => {
  it("hydrates editAssignments with the real detail, not {}", async () => {
    getProfileDetail.mockResolvedValue(WORK_DETAIL);
    const user = userEvent.setup();

    render(<ProfilesClient />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Start update" }));

    await waitFor(() => expect(getProfileDetail).toHaveBeenCalledWith("work"));
    await waitFor(() => {
      expect(screen.getByTestId("edit-assignments").textContent).toContain(
        "sdd-orchestrator-work",
      );
    });
    expect(screen.getByTestId("edit-assignments").textContent).not.toContain(
      "sdd-init-work",
    );
  });

  it("hydrates the Base detail via the empty-name identity", async () => {
    getProfileDetail.mockResolvedValue({
      name: "",
      assignments: {
        "gentle-orchestrator": {
          provider: "openai",
          model: "gpt-4",
          variant: "low",
        },
      },
    });
    const user = userEvent.setup();

    render(<ProfilesClient />, { wrapper });
    await user.click(
      await screen.findByRole("button", { name: "Start base update" }),
    );

    await waitFor(() => expect(getProfileDetail).toHaveBeenCalledWith(""));
    await waitFor(() => {
      expect(screen.getByTestId("edit-assignments").textContent).toContain(
        "gentle-orchestrator",
      );
    });
  });

  it("never writes from the Base update screen: save is a no-op that does not call updateProfile", async () => {
    getProfileDetail.mockResolvedValue({
      name: "",
      assignments: {
        "gentle-orchestrator": { provider: "openai", model: "gpt-4", variant: "low" },
      },
    });
    const user = userEvent.setup();

    render(<ProfilesClient />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Start base update" }));
    await waitFor(() => {
      expect(screen.getByTestId("edit-assignments").textContent).toContain(
        "gentle-orchestrator",
      );
    });

    await user.click(screen.getByRole("button", { name: "Update profile" }));

    expect(updateProfile).not.toHaveBeenCalled();
    expect(screen.getByTestId("pending-action").textContent).toBe("");
  });

  it("never saves a named profile: the retired save is a no-op that does not call updateProfile", async () => {
    getProfileDetail.mockResolvedValue(WORK_DETAIL);
    const user = userEvent.setup();

    render(<ProfilesClient />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Start update" }));
    await waitFor(() => {
      expect(screen.getByTestId("edit-assignments").textContent).toContain(
        "sdd-orchestrator-work",
      );
    });

    await user.click(screen.getByRole("button", { name: "Update profile" }));

    expect(updateProfile).not.toHaveBeenCalled();
    expect(screen.getByTestId("pending-action").textContent).toBe("");
  });

  it("clears local state on cancel without calling updateProfile", async () => {
    getProfileDetail.mockResolvedValue(WORK_DETAIL);
    const user = userEvent.setup();

    render(<ProfilesClient />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Start update" }));
    await waitFor(() => {
      expect(screen.getByTestId("edit-assignments").textContent).toContain(
        "sdd-orchestrator-work",
      );
    });

    await user.click(screen.getByRole("button", { name: "Cancel update" }));

    expect(updateProfile).not.toHaveBeenCalled();
    expect(screen.queryByTestId("edit-assignments")).toBeNull();
  });

  it("blocks save while the detail is loading", async () => {
    let resolveDetail!: (v: unknown) => void;
    getProfileDetail.mockReturnValue(
      new Promise((resolve) => {
        resolveDetail = resolve;
      }),
    );
    const user = userEvent.setup();

    render(<ProfilesClient />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Start update" }));

    expect(screen.getByTestId("detail-loading").textContent).toBe("true");
    await user.click(screen.getByRole("button", { name: "Update profile" }));

    expect(updateProfile).not.toHaveBeenCalled();

    resolveDetail(WORK_DETAIL);
    await waitFor(() =>
      expect(screen.getByTestId("detail-loading").textContent).toBe("false"),
    );
  });

  it("blocks save and surfaces the error when the detail request fails", async () => {
    getProfileDetail.mockRejectedValue(new Error("Network error"));
    const user = userEvent.setup();

    render(<ProfilesClient />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Start update" }));

    await waitFor(() =>
      expect(screen.getByTestId("detail-error").textContent).toBe("Network error"),
    );
    await user.click(screen.getByRole("button", { name: "Update profile" }));

    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("does not call getProfileDetail or mutate in audit mode", async () => {
    const user = userEvent.setup();

    render(
      <AuditModeProvider isAuditMode={true}>
        <ProfilesClient />
      </AuditModeProvider>,
      { wrapper },
    );
    await user.click(await screen.findByRole("button", { name: "Start update" }));

    expect(getProfileDetail).not.toHaveBeenCalled();
    expect(screen.queryByTestId("edit-assignments")).toBeNull();
    expect(updateProfile).not.toHaveBeenCalled();
  });
});

describe("ProfilesClient retired operations", () => {
  it("does not hand the view a create handler and never calls createProfile", async () => {
    render(<ProfilesClient />, { wrapper });

    await screen.findByRole("button", { name: "Assign orchestrator" });

    expect(screen.getByTestId("has-create-handler").textContent).toBe("false");
    expect(createProfile).not.toHaveBeenCalled();
  });

  it("does not hand the view any repair handler and never calls repairProfile", async () => {
    render(<ProfilesClient />, { wrapper });

    await screen.findByRole("button", { name: "Assign orchestrator" });

    expect(screen.getByTestId("has-repair-handlers").textContent).toBe("false");
    expect(repairProfile).not.toHaveBeenCalled();
  });
});
