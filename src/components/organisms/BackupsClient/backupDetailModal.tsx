"use client";

import { useEffect, useRef } from "react";
import { FileText, SearchX, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { getLocale, t } from "@/resources/resources";
import { getBytes } from "@/utils/formatting";
import type { BackupDetail } from "@/services/backupsApiService";
import type { BackupInfo } from "./backupsClientTypes";

interface BackupDetailModalProps {
  backup: BackupInfo;
  detail: BackupDetail | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function BackupDetailModal({
  backup,
  detail,
  loading,
  error,
  onClose,
}: BackupDetailModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, []);

  const shown = detail ?? backup;
  const exactDate = new Intl.DateTimeFormat(getLocale() === "es" ? "es-ES" : "en-US", {
    dateStyle: "full",
    timeStyle: "long",
  }).format(new Date(shown.timestamp));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 h-full w-full cursor-default bg-black/60"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-detail-title"
        aria-describedby="backup-detail-description"
        className="relative z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col border-2 border-border bg-card text-card-foreground shadow-[8px_8px_0_0_var(--border)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b-2 border-border bg-primary p-4 text-primary-foreground sm:p-6">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold uppercase tracking-widest">{t("backups_detail_eyebrow")}</p>
            <h2 id="backup-detail-title" className="mt-1 break-all font-mono text-xl font-black uppercase sm:text-2xl">
              {backup.id}
            </h2>
            <p id="backup-detail-description" className="mt-2 text-sm text-primary-foreground/80">
              {t("backups_detail_description")}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={t("backups_detail_close")}
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border-2 border-current bg-primary shadow-[4px_4px_0_0_currentColor] transition-shadow hover:shadow-none focus-visible:outline-2 focus-visible:outline-offset-4"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto p-4 scrollbar-brutal sm:p-6">
          <dl className="grid border-l border-t border-border sm:grid-cols-2">
            {[
              [t("backups_detail_date"), <time key="date" dateTime={shown.timestamp}>{exactDate}</time>],
              [t("backups_detail_size"), getBytes(shown.size)],
              [t("backups_source"), shown.source],
              [t("backups_detail_file_count"), String(shown.fileCount)],
            ].map(([label, value]) => (
              <div key={String(label)} className="min-w-0 border-b border-r border-border p-3">
                <dt className="font-mono text-xs font-bold uppercase text-muted-foreground">{label}</dt>
                <dd className="mt-1 break-words text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          {loading && (
            <div role="status" className="mt-6 flex items-center gap-3 border border-border bg-muted p-4 text-sm">
              <Spinner aria-hidden="true" /> {t("backups_detail_loading")}
            </div>
          )}
          {error && (
            <div role="alert" className="mt-6 border-2 border-destructive bg-destructive/10 p-4 text-sm text-destructive">
              {t("backups_detail_error")}: {error}
            </div>
          )}

          {!loading && !error && detail && (
            <>
              <section className="mt-6" aria-labelledby="backup-files-title">
                <h3 id="backup-files-title" className="font-mono text-sm font-black uppercase">
                  {t("backups_detail_files_title")}
                </h3>
                {detail.files.length === 0 ? (
                  <p className="mt-3 border border-border bg-muted p-4 text-sm text-muted-foreground">
                    {t("backups_detail_files_empty")}
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-border border border-border bg-muted">
                    {detail.files.map((file, index) => (
                      <li key={`${file.path ?? "protected"}-${index}`} className="flex min-w-0 items-start gap-3 p-3 font-mono text-xs">
                        <FileText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="break-all">{file.path ?? t("backups_detail_file_protected")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="mt-6" aria-labelledby="backup-preview-title">
                <h3 id="backup-preview-title" className="font-mono text-sm font-black uppercase">
                  {t("backups_detail_preview_title")}
                </h3>
                <div className="mt-3 flex items-start gap-3 border-2 border-border bg-muted p-4">
                  <SearchX className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">{t("backups_detail_preview_unavailable")}</p>
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
