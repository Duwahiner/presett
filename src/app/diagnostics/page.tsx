"use client";

import { Activity } from "lucide-react";
import { Badge } from "@/components/atoms/Badge/badge";
import { DiagnosticsClient } from "@/components/organisms/DiagnosticsClient/diagnosticsClient";
import { t } from "@/resources/resources";

export const dynamic = "force-dynamic";

export default function DiagnosticsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-primary/15">
            <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-card-foreground">{t("diagnostics_title")}</h1>
              <Badge variant="success">{t("diagnostics_status_badge")}</Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("diagnostics_header_description")}</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 scrollbar-brutal"><DiagnosticsClient /></div>
    </div>
  );
}
