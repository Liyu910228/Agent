import type { ModelInfo } from "./modelTypes.js";

let models: ModelInfo[] = [];
let lastSyncedAt: string | null = null;
let lastError: string | null = null;
const modelFailures = new Map<
  string,
  { failureCount: number; lastError: string; disabled: boolean }
>();

const decorateModel = (model: ModelInfo): ModelInfo => {
  const failure = modelFailures.get(model.id);

  return {
    ...model,
    healthStatus: failure?.disabled ? "disabled" : "available",
    failureCount: failure?.failureCount ?? 0,
    lastError: failure?.lastError
  };
};

export const getModelStore = () => ({
  models: models.map(decorateModel),
  lastSyncedAt,
  error: lastError
});

export const saveModels = (nextModels: ModelInfo[]) => {
  models = nextModels;
  lastSyncedAt = new Date().toISOString();
  lastError = null;
};

export const saveModelError = (message: string) => {
  lastError = message;
};

export const recordModelSuccess = (modelId: string) => {
  modelFailures.delete(modelId);
};

export const recordModelFailure = (modelId: string, message: string) => {
  const current = modelFailures.get(modelId);
  const failureCount = (current?.failureCount ?? 0) + 1;

  modelFailures.set(modelId, {
    failureCount,
    lastError: message,
    disabled: failureCount >= 1
  });
};

export const resetModelHealth = () => {
  modelFailures.clear();
};
