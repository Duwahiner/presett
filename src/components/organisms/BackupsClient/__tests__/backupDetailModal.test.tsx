import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { BackupDetailModal } from "../backupDetailModal";

const backup = {
  id: "backup-1",
  source: "/home/user/project",
  timestamp: "2026-08-10T20:00:00Z",
  fileCount: 2,
  size: 2048,
  pinned: false,
};

const detail = {
  ...backup,
  files: [{ path: "settings.json" }, { path: null }],
  changePreview: { available: false } as const,
};

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>View details</button>
      {open && (
        <BackupDetailModal
          backup={backup}
          detail={detail}
          loading={false}
          error={null}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

describe("BackupDetailModal", () => {
  it("shows real metadata, protected paths, and the explicit preview limit", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    await user.click(screen.getByRole("button", { name: "View details" }));

    const dialog = screen.getByRole("dialog", { name: "backup-1" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("settings.json")).toBeTruthy();
    expect(screen.getByText("Protected path")).toBeTruthy();
    expect(screen.getByText(/does not preserve a verifiable diff/i)).toBeTruthy();
    expect(screen.getByText("2.05 KB")).toBeTruthy();
    expect(screen.getByText(/2026/).closest("time")?.getAttribute("datetime")).toBe(backup.timestamp);
  });

  it("focuses close, closes with Escape, and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const trigger = screen.getByRole("button", { name: "View details" });

    await user.click(trigger);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close backup detail" }));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close backup detail" }));
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps long content inside an internal scroll region", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    await user.click(screen.getByRole("button", { name: "View details" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("max-h-[calc(100dvh-2rem)]");
    expect(screen.getByText("Included files").parentElement?.parentElement?.className).toContain("overflow-y-auto");
  });

  it("announces loading, error, and empty-file states", () => {
    const onClose = () => undefined;
    const { rerender } = render(
      <BackupDetailModal backup={backup} detail={null} loading error={null} onClose={onClose} />,
    );
    expect(screen.getByRole("status").textContent).toContain("Loading detail");

    rerender(
      <BackupDetailModal backup={backup} detail={null} loading={false} error="Unavailable" onClose={onClose} />,
    );
    expect(screen.getByRole("alert").textContent).toContain("Unavailable");

    rerender(
      <BackupDetailModal
        backup={backup}
        detail={{ ...detail, files: [] }}
        loading={false}
        error={null}
        onClose={onClose}
      />,
    );
    expect(screen.getByText("The manifest does not record any included files.")).toBeTruthy();
  });
});
