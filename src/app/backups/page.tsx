"use client";

import { Archive } from "lucide-react";
import { Card } from "@/components/atoms/Card/Card";
import { Badge } from "@/components/atoms/Badge/Badge";
import { BackupsClient } from "@/components/organisms/BackupsClient/BackupsClient";
import { t } from "@/resources/resources";

export const dynamic = "force-dynamic";

export default function BackupsPage() {
  return (
    <div>
      <div className="border-b border-white/5 bg-zinc-900/30 px-8 py-8 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/20 to-orange-500/10">
              <Archive className="h-5 w-5 text-rose-400" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl">
                  {t("backups_title")}
                </h1>
                <Badge variant="success" pulsing>
                  {t("backups_status_badge")}
                </Badge>
              </div>
              <p className="mt-1 max-w-2xl text-zinc-400">
                {t("backups_header_description")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-8 py-8">
        <Card title={t("backups_cardTitle")}>
          <BackupsClient />
        </Card>
      </div>
    </div>
  );
}
