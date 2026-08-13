"use client";

import { useEffect, useState } from "react";
import { listProfiles, createProfile, switchProfile, deleteProfile, updateProfile } from "@/services/profilesApiService";
import { getCatalog } from "@/services/modelsApiService";
import { t } from "@/resources/resources";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/ModelPicker";
import { ProfilesClientView } from "./ProfilesClient.view";
import type { Profile } from "./ProfilesClient.types";

const SDD_PHASES = [
  "init", "propose", "spec", "design", "tasks",
  "apply", "verify", "archive", "explore", "onboard",
];

export function ProfilesClient() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [catalog, setCatalog] = useState<ModelCatalog>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newAssignments, setNewAssignments] = useState<
    Record<string, { provider: string; model: string; variant: string }>
  >({});
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [editAssignments, setEditAssignments] = useState<
    Record<string, { provider: string; model: string; variant: string }>
  >({});

  useEffect(() => {
    async function load() {
      try {
        const [profilesData, catalogData] = await Promise.all([
          listProfiles(),
          getCatalog(),
        ]);
        setProfiles(profilesData.profiles);
        setCatalog(catalogData.catalog);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function refresh() {
    const data = await listProfiles();
    setProfiles(data.profiles);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName) return;

    const assignments: Record<string, { provider: string; model: string; variant: string }> = {
      [`sdd-orchestrator-${newName}`]: newAssignments["orchestrator"] ?? { provider: "", model: "", variant: "" },
    };

    for (const phase of SDD_PHASES) {
      if (newAssignments[phase]?.provider) {
        assignments[`sdd-${phase}-${newName}`] = newAssignments[phase];
      }
    }

    try {
      await createProfile({ name: newName, assignments });
      setNewName("");
      setNewAssignments({});
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function handleSwitch(name: string) {
    try {
      await switchProfile(name);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(t("profiles_deleteConfirm", { name }))) return;
    try {
      await deleteProfile(name);
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function handleEditStart(name: string) {
    setEditingProfile(name);
    setEditAssignments({});
  }

  async function handleEditSave() {
    if (!editingProfile) return;
    try {
      await updateProfile(editingProfile, editAssignments);
      setEditingProfile(null);
      setEditAssignments({});
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function handleEditCancel() {
    setEditingProfile(null);
    setEditAssignments({});
  }

  return (
    <ProfilesClientView
      profiles={profiles}
      catalog={catalog}
      loading={loading}
      error={error}
      newName={newName}
      newAssignments={newAssignments}
      onNewNameChange={setNewName}
      onAssignmentChange={(key, assignment) =>
        setNewAssignments((prev) => ({ ...prev, [key]: assignment }))
      }
      onCreate={handleCreate}
      onSwitch={handleSwitch}
      onDelete={handleDelete}
      editingProfile={editingProfile}
      editAssignments={editAssignments}
      onEditStart={handleEditStart}
      onEditSave={handleEditSave}
      onEditCancel={handleEditCancel}
      onEditAssignmentChange={(key, assignment) =>
        setEditAssignments((prev) => ({ ...prev, [key]: assignment }))
      }
    />
  );
}
