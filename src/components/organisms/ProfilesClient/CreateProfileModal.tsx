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
            className="cursor-pointer p-1 text-muted-foreground transition-colors hover:text-foreground"
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
            <button
              type="button"
              onClick={onClose}
              className="flex cursor-pointer items-center justify-center gap-2 border-2 border-border bg-card px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none disabled:pointer-events-none disabled:opacity-50 light:border-black light:text-black"
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex items-center justify-center gap-2 border-2 border-border bg-primary px-4 py-2 font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-[4px_4px_0_0_var(--border)] transition-all hover:shadow-[4px_4px_0_0_var(--primary)] disabled:pointer-events-none disabled:opacity-50 light:!border-black light:!bg-white light:!text-black light:shadow-[4px_4px_0_0_#000000]"
            >
              {pendingAction === "create" && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {t("profiles_save_profile")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
