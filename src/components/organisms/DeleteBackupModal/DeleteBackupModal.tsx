"use client";

import { X } from "lucide-react";

interface DeleteBackupModalProps {
  backupName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteBackupModal({
  backupName,
  onConfirm,
  onCancel,
}: DeleteBackupModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-label="Delete backup confirmation"
        className="relative z-10 w-full max-w-md border-2 border-border bg-card p-6 shadow-[4px_4px_0_0_var(--border)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold uppercase text-foreground">
            DELETE BACKUP?
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            className="flex cursor-pointer items-center justify-center border-2 border-border bg-card p-2 text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none light:border-black"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          This action permanently removes {backupName}.
        </p>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex cursor-pointer items-center justify-center gap-2 border-2 border-border bg-card px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none light:border-black light:text-black"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex cursor-pointer items-center justify-center gap-2 border-2 border-destructive bg-destructive/10 px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-destructive shadow-[4px_4px_0_0_var(--destructive)] transition-shadow hover:!shadow-none light:border-destructive light:text-destructive"
          >
            DELETE
          </button>
        </div>
      </div>
    </div>
  );
}
