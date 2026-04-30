import { env } from "../../config/env.js";
import type { ModelInfo, ModelListState } from "./modelTypes.js";
import {
  getModelStore,
  recordModelFailure,
  recordModelSuccess,
  resetModelHealth,
  saveModelError,
  saveModels
} from "./modelStore.js";

interface OpenAiModel {
  id?: string;
  object?: string;
  created?: number;
  owned_by?: string;
}

interface OpenAiModelsResponse {
  data?: OpenAiModel[];
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string; type?: string }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

const tagModel = (id: string) => {
  const value = id.toLowerCase();
  const tags = new Set<string>();

  if (["mini", "flash", "lite", "turbo"].some((item) => value.includes(item))) {
    tags.add("速度优先");
  }

  if (["reason", "thinking", "r1", "o1", "o3"].some((item) => value.includes(item))) {
    tags.add("推理优先");
  }

  if (["tool", "function"].some((item) => value.includes(item))) {
    tags.add("工具调用");
  }

  if (["long", "128k", "200k", "1m"].some((item) => value.includes(item))) {
    tags.add("长上下文");
  }

  if (tags.size === 0) {
    tags.add("通用");
  }

  return Array.from(tags);
};

const normalizeBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, "");

const buildModelsEndpoint = (baseUrl: string) => {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized.endsWith("/v1") ? `${normalized}/models` : `${normalized}/v1/models`;
};

const buildChatEndpoint = (baseUrl: string) => {
  const normalized = normalizeBaseUrl(baseUrl);
  return normalized.endsWith("/v1")
    ? `${normalized}/chat/completions`
    : `${normalized}/v1/chat/completions`;
};

const extractText = (payload: ChatCompletionResponse) => {
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content.map((item) => item.text ?? "").join("").trim();
  }

  return "";
};

const toState = (): ModelListState => {
  const current = getModelStore();

  return {
    ...current,
    configured: Boolean(env.llmBaseUrl && env.llmApiKey),
    defaultModel: env.llmDefaultModel
  };
};

export const getModelState = () => toState();

export const refreshModels = async (): Promise<ModelListState> => {
  if (!env.llmBaseUrl || !env.llmApiKey) {
    const message = "模型服务未配置，请在 .env 中设置 LLM_BASE_URL 和 LLM_API_KEY。";
    saveModelError(message);
    throw new Error(message);
  }

  const endpoint = buildModelsEndpoint(env.llmBaseUrl);
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${env.llmApiKey}`,
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const message = `模型列表获取失败：HTTP ${response.status}`;
    saveModelError(message);
    throw new Error(message);
  }

  const payload = (await response.json()) as OpenAiModelsResponse;
  const nextModels: ModelInfo[] = (payload.data ?? [])
    .filter((item) => Boolean(item.id))
    .map((item) => ({
      id: item.id!,
      ownedBy: item.owned_by,
      created: item.created,
      capabilityTags: tagModel(item.id!)
    }));

  resetModelHealth();
  saveModels(nextModels);
  return toState();
};

export const createChatCompletion = async (
  model: string,
  messages: ChatMessage[]
) => {
  if (!env.llmBaseUrl || !env.llmApiKey) {
    throw new Error("模型服务未配置，无法调用 Chat Completions。");
  }

  const response = await fetch(buildChatEndpoint(env.llmBaseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.llmApiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 700
    })
  });

  if (!response.ok) {
    const message = `模型调用失败：HTTP ${response.status}`;
    recordModelFailure(model, message);
    throw new Error(message);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const text = extractText(payload);

  if (!text) {
    const message = "模型调用失败：返回内容为空。";
    recordModelFailure(model, message);
    throw new Error(message);
  }

  recordModelSuccess(model);
  return {
    text,
    usage: payload.usage
  };
};
