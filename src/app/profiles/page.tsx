"use client";

import { useState } from "react";
import { Layers, Plus } from "lucide-react";
import { Badge } from "@/components/atoms/Badge/Badge";
import { ProfilesClient } from "@/components/organisms/ProfilesClient/ProfilesClient";
import { t } from "@/resources/resources";

export const dynamic = "force-dynamic";

export default function ProfilesPage() {
  const [showForm, setShowForm] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  return (
    <div className="flex h-full flex-col">
      <div className="px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-primary/15">
            <Layers className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-card-foreground">
                {t("profiles_title")}
              </h1>
              <Badge variant="success" pulsing>
                {t("profiles_status_badge")}
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("profiles_header_description")}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-brutal">
        <div className="border-2 border-border bg-card shadow-[4px_4px_0_0_var(--border)]">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="font-mono text-sm font-bold uppercase text-card-foreground">
              {t("profiles_cardTitle")}
            </h2>
            <button
              type="button"
              onClick={() => { setModalKey((k) => k + 1); setShowForm(true); }}
              className="flex cursor-pointer items-center justify-center gap-2 border-2 border-border bg-card px-3 py-2 font-mono text-xs font-bold uppercase tracking-wide text-card-foreground shadow-[4px_4px_0_0_var(--border)] transition-shadow hover:!shadow-none light:border-black light:text-black"
              aria-label={t("profiles_create_title")}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              {t("profiles_create_title")}
            </button>
          </div>
          <div className="p-6">
            <ProfilesClient showForm={showForm} setShowForm={setShowForm} modalKey={modalKey} setModalKey={setModalKey} />
          </div>
        </div>
      </div>
    </div>
  );
}
