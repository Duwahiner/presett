"use client";

import { Loader2, Plus, Trash2, UserCircle } from "lucide-react";
import { Button } from "@/components/atoms/Button/Button";
import { Badge } from "@/components/atoms/Badge/Badge";
import { ErrorBanner } from "@/components/molecules/ErrorBanner/ErrorBanner";
import { ModelPicker } from "@/components/molecules/ModelPicker/ModelPicker";
import { t } from "@/resources/resources";
import type { ProfilesClientViewProps } from "./ProfilesClient.types";

export function ProfilesClientView({
  profiles,
  catalog,
  loading,
  error,
  newName,
  newAssignments,
  onNewNameChange,
  onAssignmentChange,
  onCreate,
  onSwitch,
  onDelete,
}: ProfilesClientViewProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-zinc-900/60 p-8 text-zinc-400 shadow-xl backdrop-blur-sm">
        <Loader2 className="h-5 w-5 animate-spin text-rose-400" aria-hidden="true" />
        <span>{t("profiles_loading")}</span>
      </div>
    );
  }

  if (error) return <ErrorBanner title={t("profiles_loadError")} message={error} />;

  return (
    <div className="space-y-6">
      <form
        onSubmit={onCreate}
        className="rounded-xl border border-white/[0.08] bg-zinc-900/60 p-6 shadow-xl shadow-black/20 backdrop-blur-sm transition-colors hover:border-white/15"
      >
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-rose-400" aria-hidden="true" />
          <h4 className="font-semibold text-zinc-100">{t("profiles_create_title")}</h4>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="profile-name"
              className="text-xs font-medium uppercase tracking-wider text-zinc-400"
            >
              {t("profiles_create_placeholder")}
            </label>
            <input
              id="profile-name"
              type="text"
              placeholder={t("profiles_create_placeholder")}
              value={newName}
              onChange={(e) => onNewNameChange(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/30"
            />
          </div>

          <div className="space-y-2">
            <ModelPicker
              catalog={catalog}
              onConfirm={(a) => onAssignmentChange("orchestrator", a)}
              disabled={false}
            />
            <p className="text-xs text-zinc-500">{t("profiles_create_required")}</p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={!newName || !newAssignments["orchestrator"]?.provider}
          >
            {t("profiles_create_action")}
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        {profiles.map((profile) => (
          <div
            key={profile.name}
            className={`relative flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-zinc-900/60 p-4 shadow-xl shadow-black/20 backdrop-blur-sm transition-colors hover:border-white/15 hover:bg-zinc-900/80 ${
              profile.active ? "border-l-4 border-l-rose-500 pl-3" : ""
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500/20 to-orange-500/10">
                <UserCircle className="h-4 w-4 text-rose-400" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="truncate font-semibold text-zinc-100">
                    {profile.displayName}
                  </h4>
                  {profile.active && (
                    <Badge variant="success" pulsing>
                      {t("profiles_active")}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-zinc-500">
                  {profile.modelCount}{" "}
                  {profile.modelCount === 1
                    ? t("profiles_modelAssignments")
                    : t("profiles_modelAssignments_plural")}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              {!profile.active && profile.name && (
                <Button variant="ghost" size="sm" onClick={() => onSwitch(profile.name)}>
                  {t("profiles_switch")}
                </Button>
              )}
              {profile.name && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onDelete(profile.name)}
                  aria-label={t("profiles_delete")}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
