import type { ModelCatalog } from "@/components/molecules/ModelPicker/modelPicker";
import type { ListingControlsConfig, ListingControlsState } from "@/components/molecules/ListingControls/listingControlsTypes";

export interface Profile {
  name: string;
  displayName: string;
  active: boolean;
  modelCount: number;
  /** ISO-8601 timestamp of the last modification to this profile. */
  updatedAt: string;
  /** Active profile strategy detected from the config (populated by the API). */
  strategy?: "generated-multi" | "external-single-active" | "unknown";
  /** True when this generated profile is missing any of its ten phase agents. */
  incomplete?: boolean;
}

export interface ProfilesClientViewProps {
  profiles: Profile[];
  /** Active profile strategy detected from the API list, used for read-only UI. */
  strategy?: "generated-multi" | "external-single-active" | "unknown";
  catalog: ModelCatalog;
  catalogLoading: boolean;
  loading: boolean;
  error: string | null;
  pendingAction: string | null;
  newAssignments: Record<string, { provider: string; model: string; variant: string }>;
  onAssignmentChange: (key: string, assignment: { provider: string; model: string; variant: string }) => void;
  onCreate: (name: string, assignment?: { provider: string; model: string; variant: string }) => void;
  onSwitch: (name: string) => void;
  onDeleteStart: (name: string) => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  deleteConfirmProfile: string | null;
  repairConfirmProfile?: string | null;
  onRepairStart?: (name: string) => void;
  onRepairConfirm?: () => void;
  onRepairCancel?: () => void;
  editingProfile: string | null;
  editAssignments: Record<string, { provider: string; model: string; variant: string }>;
  detailLoading: boolean;
  detailError: string | null;
  onEditStart: (name: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
onEditAssignmentChange: (key: string, assignment: { provider: string; model: string; variant: string }) => void;
  derivedProfiles?: Profile[];
  controls?: ListingControlsConfig;
  controlsState?: ListingControlsState;
  onControlsChange?: (partial: Partial<ListingControlsState>) => void;
  onControlsClear?: () => void;
  connectedProviders?: string[];
}
