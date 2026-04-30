import type { RunRecord } from "../../types";
import { formatDateTime } from "../../utils/time";

interface RunRecordsSectionProps {
  error: string;
  expandedRunId: string | null;
  page: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onToggleExpand: (runId: string) => void;
  runs: RunRecord[];
}

function RunRecordsSection({
  error,
  expandedRunId,
  page,
  total,
  totalPages,
  onPageChange,
  onRefresh,
  onToggleExpand,
  runs
}: RunRecordsSectionProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">日志管理</h2>
          <p className="mt-1 text-xs text-slate-500">
            共 {total} 条，第 {page} / {totalPages} 页
          </p>
        </div>
        <button
          className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
          onClick={onRefresh}
          type="button"
        >
          刷新
        </button>
      </div>

      {error && (
        <p className="mx-5 mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="space-y-3 p-5">
        {runs.length === 0 ? (
          <p className="text-sm text-slate-500">暂无处理记录。</p>
        ) : (
          runs.map((run) => (
            <article
              className="rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm"
              key={run.id}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="min-w-0 flex-1 truncate text-sm font-semibold" title={run.question}>
                  {run.question}
                </h3>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      run.status === "success"
                        ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                        : "rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700"
                    }
                  >
                    {run.status}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    {run.questionType}
                  </span>
                  <button
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                    onClick={() => onToggleExpand(run.id)}
                    type="button"
                  >
                    {expandedRunId === run.id ? "收起" : "详情"}
                  </button>
                </div>
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                {run.finalAnswer}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded bg-slate-100 px-2 py-1">
                  创建：{formatDateTime(run.createdAt)}
                </span>
                <span className="rounded bg-slate-100 px-2 py-1">
                  完成：{formatDateTime(run.completedAt)}
                </span>
                <span className="rounded bg-slate-100 px-2 py-1">Agent：{run.participatingAgents.length}</span>
                <span className="rounded bg-slate-100 px-2 py-1">模型：{run.usedModels.join(" / ") || "-"}</span>
                <span className="rounded bg-slate-100 px-2 py-1">Skill：{run.usedSkills.length}</span>
                <span className="rounded bg-slate-100 px-2 py-1">MCP：{run.usedMcpTools.length}</span>
                <span className="rounded bg-slate-100 px-2 py-1">耗时：{run.durationMs}ms</span>
              </div>

              {expandedRunId === run.id && (
                <div className="mt-4 border-t border-slate-200 pt-4">
                  <h4 className="text-sm font-semibold">调用链详情</h4>
                  <div className="mt-3 space-y-3">
                    {run.steps.map((step, index) => (
                      <div
                        className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm"
                        key={step.id}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-white px-2 py-1 text-xs text-slate-500">
                              #{index + 1}
                            </span>
                            <span className="font-medium">{step.name}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <span
                              className={
                                step.status === "success"
                                  ? "rounded bg-emerald-50 px-2 py-1 text-emerald-700"
                                  : "rounded bg-rose-50 px-2 py-1 text-rose-700"
                              }
                            >
                              {step.status}
                            </span>
                            <span className="rounded bg-white px-2 py-1 text-slate-500">
                              {step.type}
                            </span>
                            <span className="rounded bg-white px-2 py-1 text-slate-500">
                              {step.durationMs}ms
                            </span>
                          </div>
                        </div>

                        {step.modelId && (
                          <p className="mt-2 text-xs text-slate-500">
                            模型：{step.modelId} · {step.modelReason}
                          </p>
                        )}

                        {step.tokenUsage?.totalTokens && (
                          <p className="mt-1 text-xs text-slate-500">
                            Token：{step.tokenUsage.totalTokens}
                            {step.tokenUsage.promptTokens
                              ? `，Prompt ${step.tokenUsage.promptTokens}`
                              : ""}
                            {step.tokenUsage.completionTokens
                              ? `，Completion ${step.tokenUsage.completionTokens}`
                              : ""}
                          </p>
                        )}

                        {step.error && (
                          <p className="mt-2 rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">
                            {step.error}
                          </p>
                        )}

                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                          {step.output}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
        <button
          className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          上一页
        </button>
        <button
          className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:text-slate-400"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          下一页
        </button>
      </div>
    </div>
  );
}

export default RunRecordsSection;
