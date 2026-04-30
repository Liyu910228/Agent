import {
  BUILTIN_SERVER_ID,
  type McpServerConfig,
  type McpServerTestResult
} from "./mcpRegistry.js";

export const resolveHeaderPlaceholders = (headers: Record<string, string> = {}) =>
  Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      value.replace(/\$\{([A-Z0-9_]+)\}/g, (_match, name: string) => {
        if (name === "DASHSCOPE_API_KEY") {
          return process.env.DASHSCOPE_API_KEY ?? process.env.LLM_API_KEY ?? "";
        }

        return process.env[name] ?? "";
      })
    ])
  );

export const testMcpServer = async (
  server: McpServerConfig
): Promise<McpServerTestResult> => {
  const startedAt = Date.now();

  if (!server.enabled) {
    return {
      serverId: server.id,
      success: false,
      message: "MCP Server 已禁用",
      durationMs: Date.now() - startedAt
    };
  }

  if (server.id === BUILTIN_SERVER_ID) {
    return {
      serverId: server.id,
      success: true,
      message: "内置模拟 MCP 可用",
      durationMs: Date.now() - startedAt
    };
  }

  if (server.transport === "stdio") {
    return {
      serverId: server.id,
      success: Boolean(server.command),
      message: server.command
        ? `stdio 配置有效，启动命令：${server.command}`
        : "stdio MCP Server 缺少启动命令",
      durationMs: Date.now() - startedAt
    };
  }

  if (!server.endpoint) {
    return {
      serverId: server.id,
      success: false,
      message: "HTTP/SSE MCP Server 缺少 endpoint",
      durationMs: Date.now() - startedAt
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(server.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...resolveHeaderPlaceholders(server.headers)
      },
      body: JSON.stringify({
        id: `test-${Date.now()}`,
        jsonrpc: "2.0",
        method: "tools/list",
        params: {}
      }),
      signal: controller.signal
    });

    return {
      serverId: server.id,
      success: response.ok,
      message: response.ok
        ? "HTTP/SSE MCP endpoint 响应成功"
        : `HTTP/SSE MCP endpoint 返回 ${response.status}`,
      durationMs: Date.now() - startedAt
    };
  } catch (error) {
    return {
      serverId: server.id,
      success: false,
      message: error instanceof Error ? error.message : "HTTP/SSE MCP 连接失败",
      durationMs: Date.now() - startedAt
    };
  } finally {
    clearTimeout(timeout);
  }
};
