import type { ModelCatalog } from "@/components/molecules/ModelPicker/ModelPicker";

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
  onSave: (agentKey: string, assignment: { provider: string; model: string; variant: string }) => void;
}
