"use client";

import { Cpu } from "lucide-react";
import { Badge } from "@/components/atoms/Badge/Badge";
import { ModelsClient } from "@/components/organisms/ModelsClient/ModelsClient";
import { t } from "@/resources/resources";

export const dynamic = "force-dynamic";

export default function ModelsPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-primary/15">
            <Cpu className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-card-foreground">
                {t("models_title")}
              </h1>
              <Badge variant="success" pulsing>
                {t("models_status_badge")}
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("models_header_description")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6 scrollbar-brutal">
        <div className="h-full flex flex-col border border-border bg-card p-6 shadow-[4px_4px_0_0_var(--border)]">
          <h2 className="mb-4 font-mono text-sm font-bold uppercase text-card-foreground">
            {t("models_cardTitle")}
          </h2>
          <ModelsClient />
        </div>
      </div>
    </div>
  );
}
