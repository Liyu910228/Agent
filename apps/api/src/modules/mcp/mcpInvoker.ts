import {
  BUILTIN_SERVER_ID,
  listMcpServers,
  type McpServerConfig,
  type McpToolResult
} from "./mcpRegistry.js";
import { lookupWeatherCity } from "./cityKnowledgeBase.js";
import { resolveHeaderPlaceholders } from "./mcpTester.js";

interface JsonRpcTool {
  name: string;
  description?: string;
  inputSchema?: {
    properties?: Record<string, { description?: string; type?: string }>;
  };
}

interface McpCallPayload {
  content?: Array<{ text?: string; type?: string }>;
  isError?: boolean;
  result?: unknown;
}

const keywordGroups = {
  weather: ["天气", "气温", "下雨", "温度", "weather", "forecast"],
  search: ["实时", "搜索", "查询", "新闻", "今天", "现在", "search", "web"],
  image: [
    "图片",
    "图像",
    "画图",
    "画一张",
    "生图",
    "插画",
    "海报",
    "生成一张",
    "生成图",
    "文生图",
    "image",
    "qwenimage"
  ],
  document: ["资料", "文档", "政策", "知识库", "规定"]
};

const includesAny = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.toLowerCase().includes(keyword.toLowerCase()));

const serverScore = (server: McpServerConfig, question: string) => {
  const haystack = `${server.id} ${server.name} ${server.description ?? ""}`;
  let score = 0;

  for (const keywords of Object.values(keywordGroups)) {
    if (includesAny(question, keywords) && includesAny(haystack, keywords)) {
      score += 5;
    }
  }

  if (includesAny(question, keywordGroups.weather) && includesAny(haystack, keywordGroups.search)) {
    score += 3;
  }

  if (includesAny(question, keywordGroups.search) && includesAny(haystack, keywordGroups.search)) {
    score += 2;
  }

  return score;
};

export const selectMcpServersForQuestion = (question: string) =>
  listMcpServers()
    .filter((server) => server.enabled && server.id !== BUILTIN_SERVER_ID)
    .map((server) => ({ server, score: serverScore(server, question) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((item) => item.server);

const postJsonRpc = async <T>(
  server: McpServerConfig,
  method: string,
  params: Record<string, unknown>
) => {
  if (!server.endpoint) {
    throw new Error("MCP Server 缺少 endpoint");
  }

  const response = await fetch(server.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...resolveHeaderPlaceholders(server.headers)
    },
    body: JSON.stringify({
      id: `${method}-${Date.now()}`,
      jsonrpc: "2.0",
      method,
      params
    })
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`MCP ${method} 返回 ${response.status}: ${text.slice(0, 160)}`);
  }

  return parseJsonRpcResponse<T>(text);
};

const parseJsonRpcResponse = <T>(text: string): T => {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error("MCP 返回空响应");
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Some MCP HTTP/SSE gateways respond as event streams:
    // event: message
    // data: {"jsonrpc":"2.0",...}
    const eventPayloads = trimmed
      .split(/\r?\n\r?\n/)
      .flatMap((eventBlock) => {
        const dataLines = eventBlock
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.replace(/^data:\s*/, ""))
          .filter((line) => line && line !== "[DONE]");

        return dataLines.length ? [dataLines.join("\n")] : [];
      });

    const jsonCandidates = [
      ...eventPayloads,
      ...trimmed
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("{") && line.endsWith("}"))
    ];

    for (const candidate of jsonCandidates) {
      try {
        return JSON.parse(candidate) as T;
      } catch {
        // Keep scanning: SSE streams can include progress events before data.
      }
    }
  }

  throw new Error(`MCP 返回无法解析的 JSON/SSE 响应: ${trimmed.slice(0, 160)}`);
};

const pickTool = (tools: JsonRpcTool[], question: string) => {
  const scored = tools
    .map((tool) => ({
      tool,
      score: serverScore(
        {
          id: tool.name,
          name: tool.name,
          transport: "http",
          enabled: true,
          status: "configured",
          description: tool.description
        },
        question
      )
    }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.tool ?? tools[0];
};

const extractFixedToken = (tool: JsonRpcTool) => {
  const description = tool.inputSchema?.properties?.token?.description ?? "";
  return description.match(/[a-f0-9]{32}/i)?.[0];
};

const buildToolArguments = (question: string, tool: JsonRpcTool) => {
  const shouldLookupCity = includesAny(question, keywordGroups.weather) || includesAny(
    `${tool.name} ${tool.description ?? ""}`,
    keywordGroups.weather
  );
  const city = shouldLookupCity ? lookupWeatherCity(question) : null;
  const token = extractFixedToken(tool);

  return {
    city: city?.cityName,
    cityId: city?.cityId,
    input: question,
    location: city?.cityName ?? question,
    prompt: question,
    query: question,
    q: question,
    token
  };
};

const stringifyMcpPayload = (payload: McpCallPayload) => {
  if (payload.content?.length) {
    const text = payload.content
      .map((item) => item.text)
      .filter(Boolean)
      .join("\n");
    const jsonMatch = text.match(/\{[\s\S]*?\}\s+- 以下是返回参数说明/);
    const jsonText = jsonMatch
      ? jsonMatch[0].replace(/\s+- 以下是返回参数说明$/, "")
      : text;

    let parsed: { code?: number; msg?: string };

    try {
      parsed = JSON.parse(jsonText) as { code?: number; msg?: string };
    } catch {
      return text;
    }

    if (typeof parsed.code === "number" && parsed.code !== 0) {
      throw new Error(parsed.msg ?? "MCP 返回业务错误");
    }

    return JSON.stringify(parsed);
  }

  return JSON.stringify(payload.result ?? payload);
};

export const invokeMcpServer = async (
  server: McpServerConfig,
  question: string
): Promise<McpToolResult> => {
  if (server.transport === "stdio") {
    return {
      toolId: server.id,
      output: `已匹配 stdio MCP Server「${server.name}」，当前版本已记录调用意图，真实 stdio 会话将在 MCP Client 接入后执行。`
    };
  }

  const listPayload = await postJsonRpc<{ result?: { tools?: JsonRpcTool[] } }>(
    server,
    "tools/list",
    {}
  );
  const tools = listPayload.result?.tools ?? [];
  const tool = pickTool(tools, question);

  if (!tool) {
    return {
      toolId: server.id,
      output: `MCP Server「${server.name}」已响应，但没有返回可调用工具。`
    };
  }

  const callPayload = await postJsonRpc<{ result?: McpCallPayload }>(server, "tools/call", {
    name: tool.name,
    arguments: buildToolArguments(question, tool)
  });
  const result = callPayload.result;

  if (result?.isError) {
    throw new Error(stringifyMcpPayload(result));
  }

  return {
    toolId: `${server.id}:${tool.name}`,
    output: result ? stringifyMcpPayload(result) : JSON.stringify(callPayload)
  };
};
