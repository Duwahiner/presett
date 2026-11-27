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
      <button type="button" onClick={() => props.onCreate("work")}>
        Create work
      </button>
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
      <button type="button" onClick={() => props.onRepairStart?.("work")}>
        Start repair
      </button>
      <button type="button" onClick={() => props.onRepairConfirm?.()}>
        Confirm repair
      </button>
      <button type="button" onClick={() => props.onRepairCancel?.()}>
        Cancel repair
      </button>
      <span data-testid="repair-confirm-profile">
        {props.repairConfirmProfile ?? ""}
      </span>
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

  it("sends the hydrated orchestrator-only payload on save", async () => {
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

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith("work", WORK_DETAIL.assignments),
    );
  });

  it("preserves an out-of-catalog assignment in the PUT payload", async () => {
    getProfileDetail.mockResolvedValue({
      name: "work",
      assignments: {
        "sdd-orchestrator-work": {
          provider: "acme",
          model: "legacy-model",
          variant: "legacy",
        },
      },
    });
    const user = userEvent.setup();

    render(<ProfilesClient />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Start update" }));
    await waitFor(() => {
      expect(screen.getByTestId("edit-assignments").textContent).toContain(
        "acme",
      );
    });

    await user.click(screen.getByRole("button", { name: "Update profile" }));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith("work", {
        "sdd-orchestrator-work": {
          provider: "acme",
          model: "legacy-model",
          variant: "legacy",
        },
      }),
    );
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

describe("ProfilesClient orchestrator-only creation", () => {
  it("persists only the orchestrator assignment when creating a profile", async () => {
    const user = userEvent.setup();

    render(<ProfilesClient />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Assign orchestrator" }));
    await user.click(screen.getByRole("button", { name: "Create work" }));

    await waitFor(() =>
      expect(createProfile).toHaveBeenCalledWith({
        name: "work",
        assignments: {
          "sdd-orchestrator-work": { provider: "openai", model: "gpt-4", variant: "high" },
        },
      }),
    );
  });
});

describe("ProfilesClient manual repair", () => {
  it("asks for explicit confirmation before repairing an incomplete profile", async () => {
    repairProfile.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<ProfilesClient />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Start repair" }));

    await waitFor(() =>
      expect(screen.getByTestId("repair-confirm-profile").textContent).toBe("work"),
    );
    // No repair yet — confirmation is pending.
    expect(repairProfile).not.toHaveBeenCalled();
  });

  it("triggers the repair only after explicit confirmation", async () => {
    repairProfile.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<ProfilesClient />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Start repair" }));
    await user.click(screen.getByRole("button", { name: "Confirm repair" }));

    await waitFor(() => expect(repairProfile).toHaveBeenCalledWith("work"));
  });

  it("clears the confirmation when the user cancels without repairing", async () => {
    repairProfile.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<ProfilesClient />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Start repair" }));
    await user.click(screen.getByRole("button", { name: "Cancel repair" }));

    await waitFor(() =>
      expect(screen.getByTestId("repair-confirm-profile").textContent).toBe(""),
    );
    expect(repairProfile).not.toHaveBeenCalled();
  });

  it("refreshes the profile list after a successful repair", async () => {
    repairProfile.mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(<ProfilesClient />, { wrapper });
    await user.click(await screen.findByRole("button", { name: "Start repair" }));
    await user.click(screen.getByRole("button", { name: "Confirm repair" }));

    await waitFor(() => expect(repairProfile).toHaveBeenCalledWith("work"));
    expect(listProfiles).toHaveBeenCalledTimes(2); // initial load + refresh
  });
});