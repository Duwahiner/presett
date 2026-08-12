"use client";

import { Loader2, Pencil, Plus, Trash2, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  editingProfile,
  editAssignments,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditAssignmentChange,
}: ProfilesClientViewProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        <span>{t("profiles_loading")}</span>
      </div>
    );
  }

  if (error) return <ErrorBanner title={t("profiles_loadError")} message={error} />;

  return (
    <div className="space-y-6">
      <form
        onSubmit={onCreate}
        className="rounded-xl border border-border bg-card p-6 transition-colors hover:border-border/80"
      >
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
          <h4 className="font-semibold text-card-foreground">{t("profiles_create_title")}</h4>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="profile-name"
              className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
            >
              {t("profiles_create_placeholder")}
            </label>
            <Input
              id="profile-name"
              type="text"
              placeholder={t("profiles_create_placeholder")}
              value={newName}
              onChange={(e) => onNewNameChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <ModelPicker
              catalog={catalog}
              onConfirm={(a) => onAssignmentChange("orchestrator", a)}
              disabled={false}
            />
            <p className="text-xs text-muted-foreground">{t("profiles_create_required")}</p>
          </div>

          <Button
            type="submit"
            className="w-full rounded-[3px]"
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
            className={`relative rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80 hover:bg-accent/40 ${
              profile.active ? "border-l-4 border-l-primary pl-3" : ""
            }`}
          >
            {editingProfile === profile.name ? (
              <div className="w-full space-y-4">
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-card-foreground">
                    {t("profiles_editTitle")} {profile.displayName}
                  </h4>
                </div>
                <ModelPicker
                  catalog={catalog}
                  initialProvider={editAssignments["orchestrator"]?.provider ?? ""}
                  initialModel={editAssignments["orchestrator"]?.model ?? ""}
                  initialVariant={editAssignments["orchestrator"]?.variant ?? ""}
                  onConfirm={(a) => onEditAssignmentChange("orchestrator", a)}
                />
                <div className="flex gap-2">
                  <Button onClick={onEditSave} disabled={!editAssignments["orchestrator"]?.provider}>
                    {t("profiles_save")}
                  </Button>
                  <Button variant="outline" onClick={onEditCancel}>
                    {t("backups_cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <UserCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate font-semibold text-card-foreground">
                        {profile.displayName}
                      </h4>
                      {profile.active && (
                        <Badge variant="success" pulsing>
                          {t("profiles_active")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {profile.modelCount}{" "}
                      {profile.modelCount === 1
                        ? t("profiles_modelAssignments")
                        : t("profiles_modelAssignments_plural")}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditStart(profile.name)}
                    aria-label={t("profiles_edit")}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    {t("profiles_edit")}
                  </Button>
                  {!profile.active && (
                    <Button variant="ghost" size="sm" onClick={() => onSwitch(profile.name)}>
                      {t("profiles_switch")}
                    </Button>
                  )}
                  {profile.name ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDelete(profile.name)}
                      aria-label={t("profiles_delete")}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
