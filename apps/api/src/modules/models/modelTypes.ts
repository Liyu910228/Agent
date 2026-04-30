export interface ModelInfo {
  id: string;
  ownedBy?: string;
  created?: number;
  capabilityTags: string[];
  healthStatus?: "available" | "disabled";
  failureCount?: number;
  lastError?: string;
}

export interface ModelListState {
  models: ModelInfo[];
  lastSyncedAt: string | null;
  error: string | null;
  configured: boolean;
  defaultModel: string;
}
