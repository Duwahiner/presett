"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onCancel}
          >
            <X className="size-4" />
          </Button>
        </div>

        <p className="mb-6 text-sm text-muted-foreground">
          This action permanently removes {backupName}.
        </p>

        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            CANCEL
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            DELETE
          </Button>
        </div>
      </div>
    </div>
  );
}
