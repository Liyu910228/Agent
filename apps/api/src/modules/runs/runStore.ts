import type { RunRecord } from "../orchestrator/runTypes.js";
import { readJson, writeJson } from "../../data/jsonStore.js";

const RUNS_FILE = "runs.json";

const runs: RunRecord[] = readJson<RunRecord[]>(RUNS_FILE, []);

export const saveRun = (run: RunRecord) => {
  runs.unshift(run);
  writeJson(RUNS_FILE, runs.slice(0, 200));
  return run;
};

export const listRuns = (page = 1, pageSize = 10) => {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(50, Math.max(1, pageSize));
  const start = (safePage - 1) * safePageSize;

  return {
    page: safePage,
    pageSize: safePageSize,
    runs: runs.slice(start, start + safePageSize),
    total: runs.length,
    totalPages: Math.max(1, Math.ceil(runs.length / safePageSize))
  };
};

export const getRunStats = () => {
  const totalRuns = runs.length;
  const successRuns = runs.filter((run) => run.status === "success").length;
  const failedRuns = totalRuns - successRuns;
  const totalDurationMs = runs.reduce((sum, run) => sum + run.durationMs, 0);
  const totalTokens = runs.reduce(
    (sum, run) =>
      sum +
      run.steps.reduce(
        (stepSum, step) => stepSum + (step.tokenUsage?.totalTokens ?? 0),
        0
      ),
    0
  );
  const uniqueModels = new Set(runs.flatMap((run) => run.usedModels));

  return {
    totalRuns,
    successRuns,
    failedRuns,
    successRate: totalRuns ? Math.round((successRuns / totalRuns) * 100) : 0,
    averageDurationMs: totalRuns ? Math.round(totalDurationMs / totalRuns) : 0,
    totalTokens,
    uniqueModelCount: uniqueModels.size
  };
};
