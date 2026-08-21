"use client";

import { Archive } from "lucide-react";
import { Badge } from "@/components/atoms/Badge/Badge";
import { BackupsClient } from "@/components/organisms/BackupsClient/BackupsClient";
import { t } from "@/resources/resources";

export const dynamic = "force-dynamic";

export default function BackupsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b-2 border-border bg-card px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-primary/15">
            <Archive className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-card-foreground">
                {t("backups_title")}
              </h1>
              <Badge variant="success" pulsing>
                {t("backups_status_badge")}
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("backups_header_description")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="border-2 border-border bg-card p-6 shadow-[4px_4px_0_0_var(--border)]">
          <h2 className="mb-4 font-mono text-sm font-bold uppercase text-card-foreground">
            {t("backups_cardTitle")}
          </h2>
          <BackupsClient />
        </div>
      </div>
    </div>
  );
}
