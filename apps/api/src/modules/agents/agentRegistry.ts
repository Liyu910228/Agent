import { readJson, writeJson } from "../../data/jsonStore.js";

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  prompt: string;
  modelStrategy: "auto" | "fixed";
  fixedModelId?: string;
}

const AGENTS_FILE = "agents.json";

const defaultAgents: AgentConfig[] = [
  {
    id: "router",
    name: "Router Agent",
    role: "识别问题类型并选择处理策略",
    prompt: "判断用户问题属于普通问答、资料检索、复杂分析还是工具查询。",
    modelStrategy: "auto"
  },
  {
    id: "general",
    name: "General Agent",
    role: "处理普通问答",
    prompt: "用清晰、简洁、可靠的方式回答通用问题。",
    modelStrategy: "auto"
  },
  {
    id: "research",
    name: "Research Agent",
    role: "处理资料、文档、政策类问题",
    prompt: "优先结合检索到的资料生成答案，并指出依据。",
    modelStrategy: "auto"
  },
  {
    id: "reasoning",
    name: "Reasoning Agent",
    role: "处理复杂分析、方案和建议类问题",
    prompt: "拆解问题、形成结构化分析，并给出可执行建议。",
    modelStrategy: "auto"
  },
  {
    id: "tool",
    name: "Tool Agent",
    role: "处理查询、订单、客户状态等工具型问题",
    prompt: "识别需要调用的工具，整理工具返回结果。",
    modelStrategy: "auto"
  },
  {
    id: "reviewer",
    name: "Reviewer Agent",
    role: "审核并整理最终答案",
    prompt: "检查答案完整性、准确性和可读性。",
    modelStrategy: "auto"
  }
];

const normalizeAgent = (agent: AgentConfig): AgentConfig => ({
  ...agent,
  modelStrategy: agent.modelStrategy ?? "auto"
});

export const agents: AgentConfig[] = readJson<AgentConfig[]>(
  AGENTS_FILE,
  defaultAgents
).map(normalizeAgent);

export const getAgentById = (id: string) => agents.find((agent) => agent.id === id);

export const updateAgent = (
  id: string,
  patch: Partial<
    Pick<AgentConfig, "role" | "prompt" | "modelStrategy" | "fixedModelId">
  >
) => {
  const agent = getAgentById(id);

  if (!agent) {
    return null;
  }

  if (typeof patch.role === "string") {
    agent.role = patch.role.trim();
  }

  if (typeof patch.prompt === "string") {
    agent.prompt = patch.prompt.trim();
  }

  if (patch.modelStrategy === "auto" || patch.modelStrategy === "fixed") {
    agent.modelStrategy = patch.modelStrategy;
  }

  if (typeof patch.fixedModelId === "string") {
    agent.fixedModelId = patch.fixedModelId.trim() || undefined;
  }

  writeJson(AGENTS_FILE, agents);
  return agent;
};
