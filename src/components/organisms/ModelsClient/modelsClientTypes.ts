import type { ModelCatalog } from "@/components/molecules/ModelPicker/modelPicker";
import type { Profile } from "@/services/profilesApiService";
import type { ProviderAuthStatus } from "@/lib/types";

export interface Assignment {
  agentKey: string;
  provider: string;
  model: string;
  variant: string;
}

export interface ModelsClientViewProps {
  assignments: Assignment[];
  catalog: ModelCatalog;
  connectedProviders?: string[];
  /**
   * Additive detection status from `GET /api/models`. When `ok: false`, the
   * page shows a warning but keeps the catalog available.
   */
  providerAuthStatus?: ProviderAuthStatus;
  catalogLoading: boolean;
  loading: boolean;
  error: string | null;
  saving: string | null;
  profiles: Profile[];
  activeProfile: string;
  syncing: boolean;
  switchingProfile: boolean;
  resetting: boolean;
  onSave: (agentKey: string, assignment: { provider: string; model: string; variant: string }) => void;
  onSwitchProfile: (name: string) => void;
  onSync: () => void;
  onReset: () => void;
}
