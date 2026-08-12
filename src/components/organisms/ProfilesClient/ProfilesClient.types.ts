import type { ModelCatalog } from "@/components/molecules/ModelPicker/ModelPicker";

export interface Profile {
  name: string;
  displayName: string;
  active: boolean;
  modelCount: number;
}

export interface ProfilesClientViewProps {
  profiles: Profile[];
  catalog: ModelCatalog;
  loading: boolean;
  error: string | null;
  newName: string;
  newAssignments: Record<string, { provider: string; model: string; variant: string }>;
  onNewNameChange: (name: string) => void;
  onAssignmentChange: (key: string, assignment: { provider: string; model: string; variant: string }) => void;
  onCreate: (e: React.FormEvent) => void;
  onSwitch: (name: string) => void;
  onDelete: (name: string) => void;
}
