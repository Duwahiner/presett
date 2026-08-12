import type { ModelCatalog } from "@/components/molecules/ModelPicker/ModelPicker";
import type { Profile } from "@/services/profilesApiService";

export interface Assignment {
  agentKey: string;
  provider: string;
  model: string;
  variant: string;
}

export interface ModelsClientViewProps {
  assignments: Assignment[];
  catalog: ModelCatalog;
  loading: boolean;
  error: string | null;
  saving: string | null;
  profiles: Profile[];
  activeProfile: string;
  syncing: boolean;
  onSave: (agentKey: string, assignment: { provider: string; model: string; variant: string }) => void;
  onSwitchProfile: (name: string) => void;
  onSync: () => void;
  onReset: () => void;
}
