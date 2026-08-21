import type { ModelCatalog } from "@/components/molecules/ModelPicker/ModelPicker";
import type { ListingControlsConfig, ListingControlsState } from "@/components/molecules/ListingControls/ListingControls.types";

export interface Profile {
  name: string;
  displayName: string;
  active: boolean;
  modelCount: number;
  /** ISO-8601 timestamp of the last modification to this profile. */
  updatedAt: string;
}

export interface ProfilesClientViewProps {
  profiles: Profile[];
  catalog: ModelCatalog;
  loading: boolean;
  error: string | null;
  pendingAction: string | null;
  newAssignments: Record<string, { provider: string; model: string; variant: string }>;
  onAssignmentChange: (key: string, assignment: { provider: string; model: string; variant: string }) => void;
  onCreate: (name: string) => void;
  onSwitch: (name: string) => void;
  onDelete: (name: string) => void;
  editingProfile: string | null;
  editAssignments: Record<string, { provider: string; model: string; variant: string }>;
  onEditStart: (name: string) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onEditAssignmentChange: (key: string, assignment: { provider: string; model: string; variant: string }) => void;
  derivedProfiles?: Profile[];
  controls?: ListingControlsConfig;
  controlsState?: ListingControlsState;
  onControlsChange?: (next: Partial<ListingControlsState>) => void;
  onControlsClear?: () => void;
}
