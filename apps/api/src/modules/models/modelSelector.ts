import { env } from "../../config/env.js";
import type { QuestionType } from "../orchestrator/router.js";
import { getModelStore } from "./modelStore.js";

export interface ModelSelection {
  modelId: string;
  reason: string;
  fallback: boolean;
}

export type AgentModelRole = "router" | "general" | "research" | "reasoning" | "tool" | "reviewer";

const preferenceByType: Record<QuestionType, string[]> = {
  general: ["速度优先", "通用"],
  research: ["长上下文", "通用"],
  reasoning: ["推理优先", "通用"],
  tool: ["工具调用", "通用"]
};

const preferenceByAgent: Record<AgentModelRole, string[]> = {
  router: ["速度优先", "通用"],
  general: ["速度优先", "通用"],
  research: ["长上下文", "通用"],
  reasoning: ["推理优先", "通用"],
  tool: ["工具调用", "通用"],
  reviewer: ["速度优先", "通用"]
};

const findByTags = (tags: string[], excludedModelIds: Set<string>) => {
  const { models } = getModelStore();

  for (const tag of tags) {
    const match = models.find(
      (model) =>
        model.healthStatus !== "disabled" &&
        model.capabilityTags.includes(tag) &&
        !excludedModelIds.has(model.id)
    );

    if (match) {
      return { model: match, tag };
    }
  }

  return null;
};

export const selectModelForTask = (
  questionType: QuestionType,
  excludedModelIds: Set<string> = new Set()
): ModelSelection => {
  const match = findByTags(preferenceByType[questionType], excludedModelIds);

  if (match) {
    return {
      modelId: match.model.id,
      reason: `根据任务类型 ${questionType} 选择带有「${match.tag}」标签的模型，并避开本次已使用模型。`,
      fallback: false
    };
  }

  return selectFallbackModel(excludedModelIds);
};

export const selectModelForAgent = (
  agentRole: AgentModelRole,
  questionType: QuestionType,
  excludedModelIds: Set<string> = new Set()
): ModelSelection => {
  const agentMatch = findByTags(preferenceByAgent[agentRole], excludedModelIds);

  if (agentMatch) {
    return {
      modelId: agentMatch.model.id,
      reason: `根据 ${agentRole} Agent 职责选择「${agentMatch.tag}」模型，并避开本次已使用模型。`,
      fallback: false
    };
  }

  const taskMatch = findByTags(preferenceByType[questionType], excludedModelIds);

  if (taskMatch) {
    return {
      modelId: taskMatch.model.id,
      reason: `未命中 Agent 专属候选，按任务类型 ${questionType} 选择「${taskMatch.tag}」模型，并避开本次已使用模型。`,
      fallback: false
    };
  }

  return selectFallbackModel(excludedModelIds);
};

export const selectDefaultModel = (): ModelSelection | null => {
  if (!env.llmDefaultModel) {
    return null;
  }

  return {
    modelId: env.llmDefaultModel,
    reason: "专业模型调用失败时，使用默认模型兜底。",
    fallback: true
  };
};

export const selectVisionModel = (
  excludedModelIds: Set<string> = new Set()
): ModelSelection => {
  if (env.llmVisionModel) {
    return {
      modelId: env.llmVisionModel,
      reason: "使用 LLM_VISION_MODEL 指定的视觉理解模型处理图片附件。",
      fallback: false
    };
  }

  const { models } = getModelStore();
  const match = models.find((model) => {
    const id = model.id.toLowerCase();

    return (
      model.healthStatus !== "disabled" &&
      !excludedModelIds.has(model.id) &&
      (model.capabilityTags.includes("视觉理解") ||
        ["vl", "vision", "visual", "omni", "qvq"].some((keyword) =>
          id.includes(keyword)
        ))
    );
  });

  if (match) {
    return {
      modelId: match.id,
      reason: "根据模型名称中的视觉能力关键词自动选择 VL 模型。",
      fallback: false
    };
  }

  return {
    modelId: "",
    reason: "未配置 LLM_VISION_MODEL，也未从模型列表中发现 VL/vision/omni/qvq 模型。",
    fallback: true
  };
};

const selectFallbackModel = (excludedModelIds: Set<string>): ModelSelection => {
  const { models } = getModelStore();
  const unusedGeneral = models.find(
    (model) => model.healthStatus !== "disabled" && !excludedModelIds.has(model.id)
  );

  if (unusedGeneral) {
    return {
      modelId: unusedGeneral.id,
      reason: "未命中能力标签，选择本次尚未使用的可用模型。",
      fallback: true
    };
  }

  if (env.llmDefaultModel) {
    return {
      modelId: env.llmDefaultModel,
      reason: "没有未使用模型可选，回退到默认模型，允许重复。",
      fallback: true
    };
  }

  return {
    modelId: "mock-model",
    reason: "未配置默认模型，使用本地模拟模型占位。",
    fallback: true
  };
};
