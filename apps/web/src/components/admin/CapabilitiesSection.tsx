import { PlugZap, Plus, Save } from "lucide-react";
import type {
  McpServerConfig,
  McpServerTestResult,
  McpToolConfig,
  SkillConfig
} from "../../types";
import SkillPanel from "./SkillPanel";
import type { SkillDraft } from "./SkillPanel";

export interface McpServerDraft {
  argsText: string;
  command: string;
  description: string;
  enabled: boolean;
  endpoint: string;
  headersText: string;
  id?: string;
  name: string;
  transport: "stdio" | "http" | "sse" | "streamableHttp";
}

interface CapabilitiesSectionProps {
  mcpTools: McpToolConfig[];
  mcpServers: McpServerConfig[];
  mcpServerDraft: McpServerDraft;
  mcpServerTests: Record<string, McpServerTestResult>;
  mcpJsonConfig: string;
  testingMcpServerId: string | null;
  skills: SkillConfig[];
  editingSkillId: string | null;
  skillDraft: SkillDraft;
  onDraftChange: (draft: McpServerDraft) => void;
  onEditMcpServer: (server: McpServerConfig) => void;
  onEditSkill: (skill: SkillConfig) => void;
  onJsonConfigChange: (config: string) => void;
  onImportMcpJson: () => void;
  onSaveMcpServer: () => void;
  onSaveSkill: (id: string) => void;
  onSkillDraftChange: (draft: SkillDraft) => void;
  onTestMcpServer: (server: McpServerConfig) => void;
  onToggleMcpServer: (server: McpServerConfig) => void;
  onToggleMcpTool: (tool: McpToolConfig) => void;
  onToggleSkill: (skill: SkillConfig) => void;
}

function CapabilitiesSection({
  mcpTools,
  mcpServers,
  mcpServerDraft,
  mcpServerTests,
  mcpJsonConfig,
  editingSkillId,
  onDraftChange,
  onEditMcpServer,
  onEditSkill,
  onImportMcpJson,
  onJsonConfigChange,
  onSaveMcpServer,
  onSaveSkill,
  onSkillDraftChange,
  onTestMcpServer,
  onToggleMcpServer,
  skills,
  skillDraft,
  testingMcpServerId,
  onToggleMcpTool,
  onToggleSkill
}: CapabilitiesSectionProps) {
  const serverNameById = new Map(
    mcpServers.map((server) => [server.id, server.name])
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
      <SkillPanel
        editingSkillId={editingSkillId}
        onEditSkill={onEditSkill}
        onSaveSkill={onSaveSkill}
        onSkillDraftChange={onSkillDraftChange}
        onToggleSkill={onToggleSkill}
        skillDraft={skillDraft}
        skills={skills}
      />

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">MCP</h2>
            <p className="mt-1 text-xs text-slate-500">注册 Server、测试连通性并管理工具。</p>
          </div>
          <button
            className="flex items-center gap-1 rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-700 active:translate-y-px"
            onClick={onSaveMcpServer}
            type="button"
          >
            <Save size={14} />
            {mcpServerDraft.id ? "保存修改" : "保存 Server"}
          </button>
        </div>

        <div className="m-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Plus size={15} />
            MCP Server 配置
          </div>
          <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate-600">Server 名称</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-600"
                onChange={(event) =>
                  onDraftChange({ ...mcpServerDraft, name: event.target.value })
                }
                placeholder="例如：天气服务"
                value={mcpServerDraft.name}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-slate-600">Transport</span>
              <select
                className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-600"
                onChange={(event) =>
                  onDraftChange({
                    ...mcpServerDraft,
                    transport: event.target.value as
                      | "stdio"
                      | "http"
                      | "sse"
                      | "streamableHttp"
                  })
                }
                value={mcpServerDraft.transport}
              >
                <option value="stdio">stdio</option>
                <option value="http">http</option>
                <option value="sse">sse</option>
                <option value="streamableHttp">streamableHttp</option>
              </select>
            </label>
            {mcpServerDraft.transport === "stdio" ? (
              <>
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-slate-600">启动命令</span>
                  <input
                    className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-600"
                    onChange={(event) =>
                      onDraftChange({
                        ...mcpServerDraft,
                        command: event.target.value
                      })
                    }
                    placeholder="例如：npx"
                    value={mcpServerDraft.command}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-slate-600">参数</span>
                  <input
                    className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-600"
                    onChange={(event) =>
                      onDraftChange({
                        ...mcpServerDraft,
                        argsText: event.target.value
                      })
                    }
                    placeholder="多个参数用空格分隔"
                    value={mcpServerDraft.argsText}
                  />
                </label>
              </>
            ) : (
              <label className="grid gap-1.5 md:col-span-2">
                <span className="text-xs font-medium text-slate-600">Endpoint</span>
                <input
                  className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-600"
                  onChange={(event) =>
                    onDraftChange({
                      ...mcpServerDraft,
                      endpoint: event.target.value
                    })
                  }
                  placeholder="https://..."
                  value={mcpServerDraft.endpoint}
                />
              </label>
            )}
            <label className="grid gap-1.5 md:col-span-2">
              <span className="text-xs font-medium text-slate-600">用途说明</span>
              <input
                className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-600"
                onChange={(event) =>
                  onDraftChange({
                    ...mcpServerDraft,
                    description: event.target.value
                  })
                }
                placeholder="这个 Server 适合处理什么问题"
                value={mcpServerDraft.description}
              />
            </label>
            <label className="grid gap-1.5 md:col-span-2">
              <span className="text-xs font-medium text-slate-600">Headers JSON</span>
              <textarea
                className="rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-slate-600"
                onChange={(event) =>
                  onDraftChange({
                    ...mcpServerDraft,
                    headersText: event.target.value
                  })
                }
                placeholder='例如 {"Authorization":"Bearer ..."}'
                value={mcpServerDraft.headersText}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                checked={mcpServerDraft.enabled}
                onChange={(event) =>
                  onDraftChange({
                    ...mcpServerDraft,
                    enabled: event.target.checked
                  })
                }
                type="checkbox"
              />
              启用这个 MCP Server
            </label>
          </div>
        </div>

        <div className="mx-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">JSON 配置导入</p>
            <button
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-white active:translate-y-px"
              onClick={onImportMcpJson}
              type="button"
            >
              导入 JSON
            </button>
          </div>
          <textarea
            className="mt-3 min-h-32 w-full resize-y rounded-md border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-slate-600"
            onChange={(event) => onJsonConfigChange(event.target.value)}
            placeholder='{"mcpServers":{"WebSearch":{"type":"sse","baseUrl":"https://...","headers":{"Authorization":"Bearer ${DASHSCOPE_API_KEY}"}}}}'
            value={mcpJsonConfig}
          />
        </div>

        <div className="mx-5 mt-4 max-h-80 space-y-2 overflow-auto">
          {mcpServers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">暂无 MCP Server</p>
              <p className="mt-1 text-xs text-slate-500">保存或导入配置后会显示在这里。</p>
            </div>
          ) : (
            mcpServers.map((server) => (
              <div
                className="rounded-lg border border-slate-200 p-3 text-sm transition hover:border-slate-300"
                key={server.id}
              >
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate font-medium" title={server.name}>
                  {server.name}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      server.enabled
                        ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                        : "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500"
                    }
                  >
                    {server.enabled ? "已启用" : "已禁用"}
                  </span>
                  <button
                    className={
                      server.enabled
                        ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition active:translate-y-px"
                        : "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 transition active:translate-y-px"
                    }
                    onClick={() => onToggleMcpServer(server)}
                    type="button"
                  >
                    {server.enabled ? "禁用" : "启用"}
                  </button>
                  <button
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50 active:translate-y-px"
                    onClick={() => onEditMcpServer(server)}
                    type="button"
                  >
                    编辑
                  </button>
                  <button
                    className="flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50 active:translate-y-px disabled:cursor-wait disabled:text-slate-400 disabled:active:translate-y-0"
                    disabled={testingMcpServerId === server.id}
                    onClick={() => onTestMcpServer(server)}
                    type="button"
                  >
                    <PlugZap size={13} />
                    {testingMcpServerId === server.id ? "测试中" : "测试"}
                  </button>
                </div>
              </div>
              <p className="mt-1 truncate text-slate-500" title={server.endpoint ?? server.command}>
                {server.transport}
                {server.endpoint ? ` · ${server.endpoint}` : ""}
                {server.command ? ` · ${server.command}` : ""}
              </p>
              {server.description ? (
                <p className="mt-1 text-xs text-slate-400">{server.description}</p>
              ) : null}
              {mcpServerTests[server.id] ? (
                <p
                  className={
                    mcpServerTests[server.id].success
                      ? "mt-2 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-700"
                      : "mt-2 rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700"
                  }
                >
                  {mcpServerTests[server.id].message} ·{" "}
                  {mcpServerTests[server.id].durationMs}ms
                </p>
              ) : null}
              </div>
            ))
          )}
        </div>

        <div className="mx-5 mt-5 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-700">MCP 工具</h3>
          <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
            {mcpTools.filter((tool) => tool.enabled).length}/{mcpTools.length} 启用
          </span>
        </div>
        <div className="m-5 mt-4 max-h-80 space-y-2 overflow-auto">
          {mcpTools.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">暂无 MCP 工具</p>
              <p className="mt-1 text-xs text-slate-500">Server 连通后工具会自动刷新到这里。</p>
            </div>
          ) : (
            mcpTools.map((tool) => (
              <div
                className="rounded-lg border border-slate-200 p-3 text-sm transition hover:border-slate-300 hover:bg-slate-50/60"
                key={tool.id}
              >
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate font-medium" title={tool.name}>
                  {tool.name}
                </p>
                <button
                  className={
                    tool.enabled
                      ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition active:translate-y-px"
                      : "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 transition active:translate-y-px"
                  }
                  onClick={() => onToggleMcpTool(tool)}
                  type="button"
                >
                  {tool.enabled ? "禁用" : "启用"}
                </button>
              </div>
              <p className="mt-1 line-clamp-2 text-slate-500">{tool.description}</p>
              <p className="mt-2 text-xs text-slate-400">
                Server：{serverNameById.get(tool.serverId) ?? tool.serverId}
              </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default CapabilitiesSection;
