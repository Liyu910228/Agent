import { Router } from "express";
import {
  findMcpServer,
  importMcpServersFromJson,
  listMcpServers,
  listMcpTools,
  setMcpToolEnabled,
  upsertMcpServer,
  type McpServerTransport
} from "./mcpRegistry.js";
import { testMcpServer } from "./mcpTester.js";

export const mcpRoutes = Router();

const isMcpServerTransport = (
  transport: unknown
): transport is McpServerTransport =>
  transport === "stdio" ||
  transport === "http" ||
  transport === "sse" ||
  transport === "streamableHttp";

mcpRoutes.get("/servers", (_req, res) => {
  res.json({
    servers: listMcpServers()
  });
});

mcpRoutes.post("/servers", (req, res) => {
  const {
    args,
    command,
    description,
    enabled = true,
    endpoint,
    headers,
    name,
    transport
  } = req.body as {
    args?: string[];
    command?: string;
    description?: string;
    enabled?: boolean;
    endpoint?: string;
    headers?: Record<string, string>;
    name?: string;
    transport?: McpServerTransport;
  };

  if (!name || !isMcpServerTransport(transport)) {
    res.status(400).json({ error: "name 和 transport 必填" });
    return;
  }

  try {
    res.status(201).json({
      server: upsertMcpServer({
        args,
        command,
        description,
        enabled,
        endpoint,
        headers,
        name,
        transport
      })
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "MCP Server 保存失败"
    });
  }
});

mcpRoutes.patch("/servers/:id", (req, res) => {
  const { id } = req.params;
  const {
    args,
    command,
    description,
    enabled = true,
    endpoint,
    headers,
    name,
    transport
  } = req.body as {
    args?: string[];
    command?: string;
    description?: string;
    enabled?: boolean;
    endpoint?: string;
    headers?: Record<string, string>;
    name?: string;
    transport?: McpServerTransport;
  };

  if (!name || !isMcpServerTransport(transport)) {
    res.status(400).json({ error: "name 和 transport 必填" });
    return;
  }

  try {
    res.json({
      server: upsertMcpServer({
        args,
        command,
        description,
        enabled,
        endpoint,
        headers,
        id,
        name,
        transport
      })
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "MCP Server 保存失败"
    });
  }
});

mcpRoutes.post("/servers/import-json", (req, res) => {
  const { configText } = req.body as { configText?: string };

  if (!configText?.trim()) {
    res.status(400).json({ error: "configText 不能为空" });
    return;
  }

  try {
    res.json({
      servers: importMcpServersFromJson(configText)
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "MCP JSON 导入失败"
    });
  }
});

mcpRoutes.post("/servers/:id/test", async (req, res) => {
  const { id } = req.params;
  const server = findMcpServer(id);

  if (!server) {
    res.status(404).json({ error: "MCP Server 不存在" });
    return;
  }

  const result = await testMcpServer(server);
  res.json({ result });
});

mcpRoutes.get("/tools", (_req, res) => {
  res.json({
    tools: listMcpTools().map(({ run: _run, ...tool }) => tool)
  });
});

mcpRoutes.patch("/tools/:id", (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body as { enabled?: boolean };

  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled 必须是 boolean" });
    return;
  }

  const tool = setMcpToolEnabled(id, enabled);

  if (!tool) {
    res.status(404).json({ error: "MCP 工具不存在" });
    return;
  }

  const { run: _run, ...payload } = tool;
  res.json({ tool: payload });
});
