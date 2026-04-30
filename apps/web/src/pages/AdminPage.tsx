import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import AgentConfigSection, {
  type AgentDraft
} from "../components/admin/AgentConfigSection";
import AdminHeader from "../components/admin/AdminHeader";
import AdminOverview from "../components/admin/AdminOverview";
import CapabilitiesSection from "../components/admin/CapabilitiesSection";
import type { McpServerDraft } from "../components/admin/CapabilitiesSection";
import ModelListSection from "../components/admin/ModelListSection";
import RunRecordsSection from "../components/admin/RunRecordsSection";
import type {
  AgentConfig,
  BootstrapStatus,
  McpServerConfig,
  McpServerTestResult,
  McpToolConfig,
  ModelListState,
  RunRecord,
  RunStats,
  SessionUser,
  SkillConfig
} from "../types";

interface AdminPageProps {
  user: SessionUser;
  status: BootstrapStatus | null;
  onLogout: () => void;
}

function AdminPage({ user, status, onLogout }: AdminPageProps) {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [agentDraft, setAgentDraft] = useState<AgentDraft>({
    fixedModelId: "",
    modelStrategy: "auto",
    prompt: "",
    role: ""
  });
  const [configError, setConfigError] = useState("");
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);
  const [mcpTools, setMcpTools] = useState<McpToolConfig[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([]);
  const [mcpServerTests, setMcpServerTests] = useState<
    Record<string, McpServerTestResult>
  >({});
  const [mcpServerDraft, setMcpServerDraft] = useState<McpServerDraft>({
    argsText: "",
    command: "",
    description: "",
    enabled: true,
    endpoint: "",
    name: "",
    transport: "stdio"
  });
  const [mcpJsonConfig, setMcpJsonConfig] = useState("");
  const [testingMcpServerId, setTestingMcpServerId] = useState<string | null>(
    null
  );
  const [modelError, setModelError] = useState("");
  const [models, setModels] = useState<ModelListState | null>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [runPage, setRunPage] = useState(1);
  const [runTotal, setRunTotal] = useState(0);
  const [runTotalPages, setRunTotalPages] = useState(1);
  const [runStats, setRunStats] = useState<RunStats | null>(null);
  const [skills, setSkills] = useState<SkillConfig[]>([]);

  const refreshRuns = (page = runPage) => {
    Promise.all([apiClient.listRuns(page, 10), apiClient.getRunStats()])
      .then(([runsResponse, statsResponse]) => {
        setRuns(runsResponse.runs);
        setRunPage(runsResponse.page);
        setRunTotal(runsResponse.total);
        setRunTotalPages(runsResponse.totalPages);
        setRunStats(statsResponse.stats);
      })
      .catch((runError: Error) => setError(runError.message));
  };

  useEffect(() => {
    refreshRuns();
    apiClient
      .listModels()
      .then(setModels)
      .catch((nextError: Error) => setModelError(nextError.message));
    Promise.all([
      apiClient.listAgents(),
      apiClient.listSkills(),
      apiClient.listMcpTools(),
      apiClient.listMcpServers()
    ])
      .then(([agentResponse, skillResponse, mcpResponse, serverResponse]) => {
        setAgents(agentResponse.agents);
        setSkills(skillResponse.skills);
        setMcpTools(mcpResponse.tools);
        setMcpServers(serverResponse.servers);
      })
      .catch((nextError: Error) => setConfigError(nextError.message));
  }, []);

  const handleRefreshModels = async () => {
    setModelError("");
    setIsRefreshingModels(true);

    try {
      setModels(await apiClient.refreshModels());
    } catch (refreshError) {
      setModelError(
        refreshError instanceof Error ? refreshError.message : "模型刷新失败"
      );
      apiClient.listModels().then(setModels).catch(() => undefined);
    } finally {
      setIsRefreshingModels(false);
    }
  };

  const saveAgent = async (id: string) => {
    setConfigError("");

    try {
      const response = await apiClient.updateAgent(id, agentDraft);
      setAgents((current) =>
        current.map((agent) => (agent.id === id ? response.agent : agent))
      );
      setEditingAgentId(null);
    } catch (nextError) {
      setConfigError(nextError instanceof Error ? nextError.message : "保存失败");
    }
  };

  const startEditAgent = (agent: AgentConfig) => {
    setEditingAgentId(agent.id);
    setAgentDraft({
      fixedModelId: agent.fixedModelId ?? "",
      modelStrategy: agent.modelStrategy,
      prompt: agent.prompt,
      role: agent.role
    });
  };

  const toggleMcpTool = async (tool: McpToolConfig) => {
    setConfigError("");

    try {
      const response = await apiClient.updateMcpTool(tool.id, !tool.enabled);
      setMcpTools((current) =>
        current.map((item) => (item.id === tool.id ? response.tool : item))
      );
    } catch (nextError) {
      setConfigError(nextError instanceof Error ? nextError.message : "保存失败");
    }
  };

  const saveMcpServer = async () => {
    setConfigError("");

    try {
      const response = await apiClient.saveMcpServer({
        command: mcpServerDraft.command,
        description: mcpServerDraft.description,
        enabled: mcpServerDraft.enabled,
        endpoint: mcpServerDraft.endpoint,
        name: mcpServerDraft.name,
        transport: mcpServerDraft.transport,
        args: mcpServerDraft.argsText
          .split(" ")
          .map((item) => item.trim())
          .filter(Boolean)
      });
      setMcpServers((current) => [...current, response.server]);
      setMcpServerDraft({
        argsText: "",
        command: "",
        description: "",
        enabled: true,
        endpoint: "",
        name: "",
        transport: "stdio"
      });
    } catch (nextError) {
      setConfigError(nextError instanceof Error ? nextError.message : "保存失败");
    }
  };

  const importMcpJson = async () => {
    setConfigError("");

    try {
      const response = await apiClient.importMcpServersJson(mcpJsonConfig);
      setMcpServers((current) => {
        const nextById = new Map(current.map((server) => [server.id, server]));
        response.servers.forEach((server) => nextById.set(server.id, server));
        return Array.from(nextById.values());
      });
      setMcpJsonConfig("");
    } catch (nextError) {
      setConfigError(nextError instanceof Error ? nextError.message : "导入失败");
    }
  };

  const testMcpServer = async (server: McpServerConfig) => {
    setConfigError("");
    setTestingMcpServerId(server.id);

    try {
      const response = await apiClient.testMcpServer(server.id);
      setMcpServerTests((current) => ({
        ...current,
        [server.id]: response.result
      }));
    } catch (nextError) {
      setConfigError(nextError instanceof Error ? nextError.message : "测试失败");
    } finally {
      setTestingMcpServerId(null);
    }
  };

  const toggleSkill = async (skill: SkillConfig) => {
    setConfigError("");

    try {
      const response = await apiClient.updateSkill(skill.id, !skill.enabled);
      setSkills((current) =>
        current.map((item) => (item.id === skill.id ? response.skill : item))
      );
    } catch (nextError) {
      setConfigError(nextError instanceof Error ? nextError.message : "保存失败");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <AdminHeader onLogout={onLogout} status={status} user={user} />

      <section className="mx-auto max-w-7xl px-6 py-6">
        <AdminOverview runStats={runStats} status={status} />
        <div className="mt-6 space-y-6">
          <AgentConfigSection
            agentDraft={agentDraft}
            agents={agents}
            configError={configError}
            editingAgentId={editingAgentId}
            models={models}
            onDraftChange={setAgentDraft}
            onEdit={startEditAgent}
            onSave={saveAgent}
          />
          <CapabilitiesSection
            mcpServerDraft={mcpServerDraft}
            mcpServers={mcpServers}
            mcpServerTests={mcpServerTests}
            mcpJsonConfig={mcpJsonConfig}
            mcpTools={mcpTools}
            onDraftChange={setMcpServerDraft}
            onImportMcpJson={importMcpJson}
            onJsonConfigChange={setMcpJsonConfig}
            onSaveMcpServer={saveMcpServer}
            onTestMcpServer={testMcpServer}
            onToggleMcpTool={toggleMcpTool}
            onToggleSkill={toggleSkill}
            skills={skills}
            testingMcpServerId={testingMcpServerId}
          />
          <ModelListSection
            isRefreshing={isRefreshingModels}
            modelError={modelError}
            models={models}
            onRefresh={handleRefreshModels}
          />
          <RunRecordsSection
            error={error}
            expandedRunId={expandedRunId}
            onPageChange={refreshRuns}
            onRefresh={() => refreshRuns(runPage)}
            onToggleExpand={(runId) =>
              setExpandedRunId((current) => (current === runId ? null : runId))
            }
            page={runPage}
            runs={runs}
            total={runTotal}
            totalPages={runTotalPages}
          />
        </div>
      </section>
    </main>
  );
}

export default AdminPage;
