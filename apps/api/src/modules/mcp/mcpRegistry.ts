import { readJson, writeJson } from "../../data/jsonStore.js";

export interface McpToolResult {
  toolId: string;
  output: string;
}

export interface McpToolConfig {
  id: string;
  name: string;
  description: string;
  serverId: string;
  enabled: boolean;
  run: (question: string) => McpToolResult;
}

export type McpServerTransport = "stdio" | "http" | "sse" | "streamableHttp";

export interface McpServerConfig {
  id: string;
  name: string;
  transport: McpServerTransport;
  enabled: boolean;
  status: "configured" | "disabled";
  endpoint?: string;
  command?: string;
  args?: string[];
  headers?: Record<string, string>;
  description?: string;
}

export interface McpServerTestResult {
  serverId: string;
  success: boolean;
  message: string;
  durationMs: number;
}

const MCP_SETTINGS_FILE = "mcp-settings.json";
const MCP_SERVERS_FILE = "mcp-servers.json";
export const BUILTIN_SERVER_ID = "builtin-simulated";

const toolEnabledOverrides = new Map<string, boolean>(
  Object.entries(readJson<Record<string, boolean>>(MCP_SETTINGS_FILE, {}))
);

const persistedServers = readJson<McpServerConfig[]>(MCP_SERVERS_FILE, []);

const builtinServer: McpServerConfig = {
  id: BUILTIN_SERVER_ID,
  name: "内置模拟 MCP",
  transport: "stdio",
  enabled: true,
  status: "configured",
  command: "internal",
  description: "平台内置的模拟 MCP 工具，用于第一版端到端验证"
};

const withEnabled = (tool: Omit<McpToolConfig, "enabled">): McpToolConfig => ({
  ...tool,
  enabled: toolEnabledOverrides.get(tool.id) ?? true
});

const builtinMcpTools: Array<Omit<McpToolConfig, "enabled">> = [
  {
    id: "search_docs",
    name: "search_docs",
    description: "模拟检索资料、文档、政策内容",
    serverId: BUILTIN_SERVER_ID,
    run: () => ({
      toolId: "search_docs",
      output: "检索到 2 条相关资料：平台说明、处理规范。"
    })
  },
  {
    id: "query_order_status",
    name: "query_order_status",
    description: "模拟查询订单或客户状态",
    serverId: BUILTIN_SERVER_ID,
    run: () => ({
      toolId: "query_order_status",
      output: "模拟查询结果：订单状态为处理中，预计 24 小时内更新。"
    })
  },
  {
    id: "create_ticket",
    name: "create_ticket",
    description: "模拟创建工单",
    serverId: BUILTIN_SERVER_ID,
    run: (question) => ({
      toolId: "create_ticket",
      output: `已创建模拟工单，标题：${question.slice(0, 24)}`
    })
  }
];

export const listMcpTools = () => builtinMcpTools.map(withEnabled);

export const mcpTools = listMcpTools();

const sanitizeServer = (
  server: Omit<McpServerConfig, "id" | "status">
): McpServerConfig => {
  const name = server.name.trim();
  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return {
    id: id || `mcp-${Date.now()}`,
    name,
    transport: server.transport,
    enabled: server.enabled,
    status: server.enabled ? "configured" : "disabled",
    endpoint: server.endpoint?.trim() || undefined,
    command: server.command?.trim() || undefined,
    args: server.args?.filter(Boolean),
    headers: server.headers && Object.keys(server.headers).length ? server.headers : undefined,
    description: server.description?.trim() || undefined
  };
};

const saveServers = (servers: McpServerConfig[]) => {
  writeJson(
    MCP_SERVERS_FILE,
    servers.filter((server) => server.id !== BUILTIN_SERVER_ID)
  );
};

export const listMcpServers = () => [builtinServer, ...persistedServers];

export const findMcpServer = (serverId: string) =>
  listMcpServers().find((server) => server.id === serverId) ?? null;

export const upsertMcpServer = (
  input: Omit<McpServerConfig, "id" | "status"> & { id?: string }
) => {
  const nextServer = input.id
    ? {
        ...sanitizeServer(input),
        id: input.id
      }
    : sanitizeServer(input);

  if (!nextServer.name) {
    throw new Error("MCP Server 名称不能为空");
  }

  if (
    (nextServer.transport === "http" ||
      nextServer.transport === "sse" ||
      nextServer.transport === "streamableHttp") &&
    !nextServer.endpoint
  ) {
    throw new Error("HTTP/SSE MCP Server 需要 endpoint");
  }

  if (nextServer.transport === "stdio" && !nextServer.command) {
    throw new Error("stdio MCP Server 需要 command");
  }

  const existingIndex = persistedServers.findIndex(
    (server) => server.id === nextServer.id
  );

  if (existingIndex >= 0) {
    persistedServers[existingIndex] = nextServer;
  } else {
    persistedServers.push(nextServer);
  }

  saveServers(persistedServers);
  return nextServer;
};

export const importMcpServersFromJson = (configText: string) => {
  const parsed = JSON.parse(configText) as {
    mcpServers?: Record<
      string,
      {
        args?: string[];
        baseUrl?: string;
        command?: string;
        description?: string;
        headers?: Record<string, string>;
        isActive?: boolean;
        name?: string;
        type?: McpServerTransport;
        url?: string;
      }
    >;
  };

  if (!parsed.mcpServers || typeof parsed.mcpServers !== "object") {
    throw new Error("JSON 中缺少 mcpServers 对象");
  }

  return Object.entries(parsed.mcpServers).map(([id, server]) =>
    upsertMcpServer({
      args: server.args,
      command: server.command,
      description: server.description,
      enabled: server.isActive ?? true,
      endpoint: server.baseUrl ?? server.url,
      headers: server.headers,
      id,
      name: server.name ?? id,
      transport: server.type ?? "http"
    })
  );
};

export const setMcpToolEnabled = (toolId: string, enabled: boolean) => {
  const tool = listMcpTools().find((item) => item.id === toolId);

  if (!tool) {
    return null;
  }

  toolEnabledOverrides.set(toolId, enabled);
  writeJson(MCP_SETTINGS_FILE, Object.fromEntries(toolEnabledOverrides));
  return listMcpTools().find((item) => item.id === toolId) ?? null;
};

export const runMcpTool = (toolId: string, question: string) => {
  const tool = listMcpTools().find((item) => item.id === toolId);

  if (!tool) {
    throw new Error(`MCP tool not found: ${toolId}`);
  }

  if (!tool.enabled) {
    throw new Error(`MCP tool disabled: ${toolId}`);
  }

  return tool.run(question);
};
