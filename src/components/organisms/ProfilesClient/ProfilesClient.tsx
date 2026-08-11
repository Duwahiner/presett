"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { ErrorBanner } from "@/components/molecules/ErrorBanner/ErrorBanner";
import { ModelPicker } from "@/components/molecules/ModelPicker/ModelPicker";
import type { ModelCatalog } from "@/components/molecules/ModelPicker/ModelPicker";

const SDD_PHASES = [
  "init",
  "propose",
  "spec",
  "design",
  "tasks",
  "apply",
  "verify",
  "archive",
  "explore",
  "onboard",
];

interface Profile {
  name: string;
  displayName: string;
  active: boolean;
  modelCount: number;
}

export function ProfilesClient() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [catalog, setCatalog] = useState<ModelCatalog>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newAssignments, setNewAssignments] = useState<
    Record<string, { provider: string; model: string; variant: string }>
  >({});

  useEffect(() => {
    async function load() {
      try {
        const [profilesRes, catalogRes] = await Promise.all([
          fetch("/api/profiles"),
          fetch("/api/models"),
        ]);

        if (!profilesRes.ok) {
          const body = await profilesRes.json();
          throw new Error(body.error?.message ?? "Failed to load profiles");
        }

        const profilesData = await profilesRes.json();
        setProfiles(profilesData.profiles);

        if (catalogRes.ok) {
          const data = await catalogRes.json();
          setCatalog(data.catalog);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  async function refresh() {
    const response = await fetch("/api/profiles");
    const data = await response.json();
    setProfiles(data.profiles);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName) return;

    const assignments: Record<string, { provider: string; model: string; variant: string }> = {
      [`sdd-orchestrator-${newName}`]: newAssignments["orchestrator"] ?? { provider: "", model: "", variant: "" },
    };

    for (const phase of SDD_PHASES) {
      const key = `${phase}`;
      if (newAssignments[key]?.provider) {
        assignments[`sdd-${phase}-${newName}`] = newAssignments[key];
      }
    }

    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, assignments }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Create failed");
      }

      setNewName("");
      setNewAssignments({});
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function handleSwitch(name: string) {
    try {
      const response = await fetch(`/api/profiles/${encodeURIComponent(name)}/switch`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Switch failed");
      }

      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete profile "${name}"?`)) return;

    try {
      const response = await fetch(`/api/profiles/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error?.message ?? "Delete failed");
      }

      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  if (loading) return <p className="text-zinc-400">Loading...</p>;
  if (error)
    return <ErrorBanner title="Could not load profiles" message={error} />;

  return (
    <div className="space-y-6">
      {error && <ErrorBanner title="Error" message={error} />}

      <form onSubmit={handleCreate} className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <h4 className="font-medium text-zinc-100">Create Profile</h4>
        <input
          type="text"
          placeholder="profile-name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
        />
        <div className="space-y-2">
          <ModelPicker
            catalog={catalog}
            onConfirm={(a) =>
              setNewAssignments((prev) => ({ ...prev, orchestrator: a }))
            }
            disabled={false}
          />
          <p className="text-xs text-zinc-500">
            Orchestrator assignment is required.
          </p>
        </div>
        <Button type="submit" disabled={!newName || !newAssignments["orchestrator"]?.provider}>
          Create
        </Button>
      </form>

      <div className="space-y-2">
        {profiles.map((profile) => (
          <div
            key={profile.name}
            className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-4"
          >
            <div>
              <h4 className="font-medium text-zinc-100">
                {profile.displayName}
                {profile.active && (
                  <span className="ml-2 text-xs text-rose-400">active</span>
                )}
              </h4>
              <p className="text-sm text-zinc-500">
                {profile.modelCount} model assignment
                {profile.modelCount === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex gap-2">
              {!profile.active && profile.name && (
                <Button onClick={() => handleSwitch(profile.name)}>
                  Switch
                </Button>
              )}
              {profile.name && (
                <Button
                  className="bg-zinc-700 hover:bg-zinc-600"
                  onClick={() => handleDelete(profile.name)}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
