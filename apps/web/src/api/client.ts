import type {
  AgentResponse,
  AgentsResponse,
  BootstrapStatus,
  LoginResponse,
  McpServerImportResponse,
  McpServerResponse,
  McpServersResponse,
  McpServerTestResponse,
  McpServerTransport,
  McpToolResponse,
  McpToolsResponse,
  ModelListState,
  RunAttachment,
  RunResponse,
  RunStatsResponse,
  RunsResponse,
  SkillResponse,
  SkillsResponse
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8083";

const request = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error ?? "请求失败");
  }

  return payload as T;
};

export const apiClient = {
  health: () => request<{ status: string; service: string; port: number }>("/api/health"),
  bootstrap: () => request<BootstrapStatus>("/api/bootstrap"),
  login: (username: string, password: string) =>
    request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    }),
  createRun: (
    question: string,
    directives?: {
      mcpServerIds?: string[];
      mcpToolIds?: string[];
      skillIds?: string[];
    },
    attachments?: RunAttachment[]
  ) =>
    request<RunResponse>("/api/runs", {
      method: "POST",
      body: JSON.stringify({ attachments, directives, question })
    }),
  listRuns: (page = 1, pageSize = 10) =>
    request<RunsResponse>(`/api/runs?page=${page}&pageSize=${pageSize}`),
  getRunStats: () => request<RunStatsResponse>("/api/runs/stats"),
  listModels: () => request<ModelListState>("/api/models"),
  refreshModels: () =>
    request<ModelListState>("/api/models/refresh", {
      method: "POST"
    }),
  listAgents: () => request<AgentsResponse>("/api/agents"),
  updateAgent: (
    id: string,
    patch: {
      role: string;
      prompt: string;
      modelStrategy: "auto" | "fixed";
      fixedModelId?: string;
    }
  ) =>
    request<AgentResponse>(`/api/agents/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    }),
  listSkills: () => request<SkillsResponse>("/api/skills"),
  updateSkill: (id: string, enabled: boolean) =>
    request<SkillResponse>(`/api/skills/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled })
    }),
  listMcpTools: () => request<McpToolsResponse>("/api/mcp/tools"),
  updateMcpTool: (id: string, enabled: boolean) =>
    request<McpToolResponse>(`/api/mcp/tools/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled })
    }),
  listMcpServers: () => request<McpServersResponse>("/api/mcp/servers"),
  saveMcpServer: (
    server: {
      id?: string;
      name: string;
      transport: McpServerTransport;
      enabled: boolean;
      endpoint?: string;
      command?: string;
      args?: string[];
      headers?: Record<string, string>;
      description?: string;
    }
  ) =>
    request<McpServerResponse>(
      server.id
        ? `/api/mcp/servers/${encodeURIComponent(server.id)}`
        : "/api/mcp/servers",
      {
        method: server.id ? "PATCH" : "POST",
        body: JSON.stringify(server)
      }
    ),
  importMcpServersJson: (configText: string) =>
    request<McpServerImportResponse>("/api/mcp/servers/import-json", {
      method: "POST",
      body: JSON.stringify({ configText })
    }),
  testMcpServer: (id: string) =>
    request<McpServerTestResponse>(
      `/api/mcp/servers/${encodeURIComponent(id)}/test`,
      {
        method: "POST"
      }
    )
};
