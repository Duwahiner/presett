"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/resources/resources";

interface CreateProfileModalProps {
  open: boolean;
  pendingAction: string | null;
  onSubmit: (name: string) => void;
  onClose: () => void;
}

export function CreateProfileModal({
  open,
  pendingAction,
  onSubmit,
  onClose,
}: CreateProfileModalProps) {
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const nameError = touched && !name.trim();
  const canSubmit = Boolean(name.trim()) && pendingAction !== "create";

  useEffect(() => {
    if (!open) return;

    // Focus the input after the dialog mounts
    requestAnimationFrame(() => inputRef.current?.focus());

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    function handleFocusTrap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleFocusTrap);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keydown", handleFocusTrap);
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!name.trim()) return;
    onSubmit(name.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-label={t("profiles_create_title")}
        className="relative z-10 w-full max-w-md border-2 border-border bg-card p-6 shadow-[4px_4px_0_0_var(--border)]"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-mono text-sm font-bold uppercase text-foreground">
            {t("profiles_create_title")}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label
              htmlFor="profile-name-modal"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t("profiles_create_placeholder")}
            </label>
            <Input
              ref={inputRef}
              id="profile-name-modal"
              type="text"
              placeholder={t("profiles_create_placeholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={nameError}
              aria-describedby={nameError ? "profile-name-error" : undefined}
            />
            {nameError && (
              <p id="profile-name-error" className="text-xs font-medium text-destructive">
                {t("profiles_name_required")}
              </p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              CANCEL
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {pendingAction === "create" && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {t("profiles_save_profile")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
