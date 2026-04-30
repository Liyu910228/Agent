import type { AgentConfig, ModelListState } from "../../types";

export interface AgentDraft {
  role: string;
  prompt: string;
  modelStrategy: "auto" | "fixed";
  fixedModelId: string;
}

interface AgentConfigSectionProps {
  agents: AgentConfig[];
  agentDraft: AgentDraft;
  configError: string;
  editingAgentId: string | null;
  models: ModelListState | null;
  onDraftChange: (draft: AgentDraft) => void;
  onEdit: (agent: AgentConfig) => void;
  onSave: (id: string) => void;
}

function AgentConfigSection({
  agents,
  agentDraft,
  configError,
  editingAgentId,
  models,
  onDraftChange,
  onEdit,
  onSave
}: AgentConfigSectionProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">Agent 配置</h2>
          <p className="mt-1 text-xs text-slate-500">
            配置角色职责、Prompt 和模型策略，影响后端调度行为。
          </p>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
          {agents.length} agents
        </span>
      </div>
      {configError && (
        <p className="mx-5 mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {configError}
        </p>
      )}
      <div className="grid gap-3 p-5 lg:grid-cols-2">
        {agents.map((agent) => (
          <article
            className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
            key={agent.id}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{agent.name}</h3>
                <p className="mt-0.5 text-xs text-slate-400">{agent.id}</p>
              </div>
              {editingAgentId === agent.id ? (
                <button
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                  onClick={() => onSave(agent.id)}
                  type="button"
                >
                  保存
                </button>
              ) : (
                <button
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100"
                  onClick={() => onEdit(agent)}
                  type="button"
                >
                  编辑
                </button>
              )}
            </div>

            {editingAgentId === agent.id ? (
              <div className="mt-3 space-y-3">
                <label className="block text-xs font-medium text-slate-500">
                  模型策略
                  <select
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    value={agentDraft.modelStrategy}
                    onChange={(event) =>
                      onDraftChange({
                        ...agentDraft,
                        modelStrategy: event.target.value as "auto" | "fixed"
                      })
                    }
                  >
                    <option value="auto">自动选模型</option>
                    <option value="fixed">固定模型</option>
                  </select>
                </label>
                {agentDraft.modelStrategy === "fixed" && (
                  <label className="block text-xs font-medium text-slate-500">
                    固定模型
                    <select
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                      value={agentDraft.fixedModelId}
                      onChange={(event) =>
                        onDraftChange({ ...agentDraft, fixedModelId: event.target.value })
                      }
                    >
                      <option value="">选择模型</option>
                      {(models?.models ?? []).map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.id}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="block text-xs font-medium text-slate-500">
                  职责
                  <input
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    value={agentDraft.role}
                    onChange={(event) =>
                      onDraftChange({ ...agentDraft, role: event.target.value })
                    }
                  />
                </label>
                <label className="block text-xs font-medium text-slate-500">
                  Prompt
                  <textarea
                    className="mt-1 min-h-24 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600"
                    value={agentDraft.prompt}
                    onChange={(event) =>
                      onDraftChange({ ...agentDraft, prompt: event.target.value })
                    }
                  />
                </label>
              </div>
            ) : (
              <div className="mt-3 text-sm leading-6 text-slate-600">
                <p>{agent.role}</p>
                <p className="mt-2 inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  模型策略：
                  {agent.modelStrategy === "fixed"
                    ? `固定 ${agent.fixedModelId || "未选择"}`
                    : "自动选模型"}
                </p>
                <p className="mt-2 line-clamp-4 rounded-md bg-slate-50 p-2 text-xs text-slate-500">
                  {agent.prompt}
                </p>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

export default AgentConfigSection;
