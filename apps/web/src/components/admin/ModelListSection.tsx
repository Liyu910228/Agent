import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ModelListState } from "../../types";

interface ModelListSectionProps {
  isRefreshing: boolean;
  modelError: string;
  models: ModelListState | null;
  onRefresh: () => void;
}

function ModelListSection({
  isRefreshing,
  modelError,
  models,
  onRefresh
}: ModelListSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">模型列表</h2>
          <p className="mt-1 text-sm text-slate-500">
            默认模型：{models?.defaultModel || "未设置"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            disabled={isRefreshing}
            onClick={onRefresh}
            type="button"
          >
            {isRefreshing ? "刷新中" : "刷新模型"}
          </button>
          <button
            className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
            onClick={() => setIsCollapsed((current) => !current)}
            type="button"
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            {isCollapsed ? "展开" : "收起"}
          </button>
        </div>
      </div>

      {(modelError || models?.error) && (
        <p className="mx-5 mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {modelError || models?.error}
        </p>
      )}

      {!isCollapsed && (
        <div className="m-5 overflow-hidden rounded-lg border border-slate-200">
          {models?.models.length ? (
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">模型 ID</th>
                  <th className="px-3 py-2 font-medium">能力标签</th>
                  <th className="px-3 py-2 font-medium">健康</th>
                  <th className="px-3 py-2 font-medium">归属</th>
                </tr>
              </thead>
              <tbody>
                {models.models.map((model) => (
                  <tr
                    className="border-t border-slate-200 hover:bg-slate-50/70"
                    key={model.id}
                  >
                    <td className="px-3 py-2 font-medium text-slate-800">{model.id}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {model.capabilityTags.map((tag) => (
                          <span
                            className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600"
                            key={tag}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          model.healthStatus === "disabled"
                            ? "rounded bg-rose-50 px-2 py-1 text-xs text-rose-700"
                            : "rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700"
                        }
                      >
                        {model.healthStatus === "disabled" ? "暂不可用" : "可用"}
                      </span>
                      {model.lastError && (
                        <p className="mt-1 max-w-64 truncate text-xs text-slate-500">
                          {model.lastError}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{model.ownedBy || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-4 text-sm text-slate-500">
              暂无模型。配置 `.env` 后点击刷新模型。
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ModelListSection;
