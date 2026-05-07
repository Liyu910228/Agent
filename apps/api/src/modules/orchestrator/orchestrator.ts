import { randomUUID } from "node:crypto";
import { getAgentById } from "../agents/agentRegistry.js";
import {
  invokeMcpServer,
  selectMcpServersForQuestion
} from "../mcp/mcpInvoker.js";
import { lookupWeatherCity } from "../mcp/cityKnowledgeBase.js";
import { findMcpServer, runMcpTool } from "../mcp/mcpRegistry.js";
import { createChatCompletion } from "../models/modelClient.js";
import {
  selectDefaultModel,
  selectModelForAgent,
  selectVisionModel
} from "../models/modelSelector.js";
import { saveRun } from "../runs/runStore.js";
import { runSkill, selectGlobalSkillsForQuestion } from "../skills/skillRegistry.js";
import { classifyQuestion } from "./router.js";
import type {
  RunAttachment,
  RunDirectiveOptions,
  RunRecord,
  RunStep
} from "./runTypes.js";

const now = () => Date.now();

const agentPrompt = (id: string, fallback: string) => {
  const agent = getAgentById(id);
  const basePrompt = agent ? `${agent.prompt}\n\n职责：${agent.role}` : fallback;

  return `${basePrompt}

面向业务端用户时，只输出用户需要的最终答案；不要解释调度过程、审核过程、候选答案、优化建议或内部判断。`;
};

const selectAgentModel = (
  agentId: string,
  agentRole: Parameters<typeof selectModelForAgent>[0],
  questionType: Parameters<typeof selectModelForAgent>[1],
  selectedModelIds: Set<string>
) => {
  const agent = getAgentById(agentId);

  if (agent?.modelStrategy === "fixed" && agent.fixedModelId) {
    return {
      modelId: agent.fixedModelId,
      reason: `${agent.name} 配置为固定模型。`,
      fallback: false
    };
  }

  return selectModelForAgent(agentRole, questionType, selectedModelIds);
};

const selectVisionAgentModel = (selectedModelIds: Set<string>) => {
  const agent = getAgentById("vision");

  if (agent?.modelStrategy === "fixed" && agent.fixedModelId) {
    return {
      modelId: agent.fixedModelId,
      reason: `${agent.name} 配置为固定视觉模型。`,
      fallback: false
    };
  }

  return selectVisionModel(selectedModelIds);
};

const createStep = (
  type: RunStep["type"],
  name: string,
  output: string,
  startedAt: number,
  model?: { modelId: string; reason: string },
  status: RunStep["status"] = "success",
  details?: Pick<RunStep, "error" | "tokenUsage">
): RunStep => ({
  id: `${type}-${name}-${randomUUID()}`,
  type,
  name,
  status,
  output,
  durationMs: Math.max(1, Date.now() - startedAt),
  modelId: model?.modelId,
  modelReason: model?.reason,
  error: details?.error,
  tokenUsage: details?.tokenUsage
});

const createFailedToolStep = (
  name: string,
  error: string,
  startedAt: number
): RunStep => ({
  id: `mcp-${name}-${randomUUID()}`,
  type: "mcp",
  name,
  status: "failed",
  output: "工具未能成功执行，已进入降级处理。",
  durationMs: Math.max(1, Date.now() - startedAt),
  error
});

const createFailedSkillStep = (
  name: string,
  error: string,
  startedAt: number
): RunStep => ({
  id: `skill-${name}-${randomUUID()}`,
  type: "skill",
  name,
  status: "failed",
  output: "Skill 未能成功执行，已进入降级处理。",
  durationMs: Math.max(1, Date.now() - startedAt),
  error
});

const uniqueStrings = (values: string[] = []) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const rememberUnique = (values: string[], value: string) => {
  if (!values.includes(value)) {
    values.push(value);
  }
};

const safeRunSkill = (skillId: string, question: string) => {
  const startedAt = now();

  try {
    const result = runSkill(skillId, question);
    return {
      result,
      step: createStep("skill", result.skillId, result.output, startedAt)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Skill 调用失败";
    return {
      result: {
        skillId,
        output: `Skill ${skillId} 当前不可用，请改用自动调度或稍后重试。`
      },
      step: createFailedSkillStep(skillId, message, startedAt)
    };
  }
};

const safeRunMcpTool = (toolId: string, question: string) => {
  const startedAt = now();

  try {
    const result = runMcpTool(toolId, question);
    return {
      result,
      step: createStep("mcp", result.toolId, result.output, startedAt)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCP 工具调用失败";
    return {
      result: {
        toolId,
        output: `工具 ${toolId} 当前不可用，请业务员补充信息或稍后重试。`
      },
      step: createFailedToolStep(toolId, message, startedAt)
    };
  }
};

const safeInvokeMcpServer = async (
  server: ReturnType<typeof selectMcpServersForQuestion>[number],
  question: string
) => {
  const startedAt = now();

  try {
    const result = await invokeMcpServer(server, question);
    return {
      result,
      step: createStep("mcp", result.toolId, result.output, startedAt)
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCP Server 调用失败";
    return {
      result: {
        toolId: server.id,
        output: `已尝试调用 MCP Server「${server.name}」，但调用失败：${message}`
      },
      step: createFailedToolStep(server.id, message, startedAt)
    };
  }
};

const createAgentStep = async (
  name: string,
  systemPrompt: string,
  userPrompt: string,
  fallbackOutput: string,
  model: { modelId: string; reason: string },
  retryModels: Array<{ modelId: string; reason: string }> = []
) => {
  const startedAt = now();
  const attempts = [model, ...retryModels];
  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      const completion = await createChatCompletion(attempt.modelId, [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]);

      return createStep(
        "agent",
        name,
        completion.text,
        startedAt,
        attempt,
        "success",
        {
          tokenUsage: {
            promptTokens: completion.usage?.prompt_tokens,
            completionTokens: completion.usage?.completion_tokens,
            totalTokens: completion.usage?.total_tokens
          }
        }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "模型调用失败";
      errors.push(`${attempt.modelId}: ${message}`);
    }
  }

  return createStep(
    "agent",
    name,
    fallbackOutput,
    startedAt,
    model,
    "failed",
    { error: errors.join("；") }
  );
};

const createVisionStep = async (
  question: string,
  attachments: RunAttachment[],
  model: { modelId: string; reason: string }
) => {
  const startedAt = now();

  if (!model.modelId) {
    return createStep(
      "agent",
      "Vision Agent",
      "图片已上传，但视觉模型未配置。请在 .env 中设置 LLM_VISION_MODEL，例如 qwen-vl-plus。",
      startedAt,
      model,
      "failed",
      { error: model.reason }
    );
  }

  const images = attachments.filter(
    (attachment) => attachment.kind === "image" && attachment.dataUrl
  );
  const documents = attachments.filter((attachment) => attachment.kind === "document");
  const documentContext = documents
    .map((attachment) => {
      const content = attachment.textContent?.trim();
      return content
        ? `文档：${attachment.name}\n${content.slice(0, 6000)}`
        : `文档：${attachment.name}（${attachment.mimeType}，${attachment.size} bytes，当前仅记录附件，未解析二进制正文）`;
    })
    .join("\n\n");

  try {
    const completion = await createChatCompletion(model.modelId, [
      {
        role: "system",
        content:
          "你是视觉理解 Agent。请结合用户上传的图片和文档回答问题。图片必须直接分析画面内容；文档如果提供了正文则可引用正文，如果只有附件信息则说明无法读取正文。只输出给业务员看的最终答案。"
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `用户问题：${question}\n\n附件：${attachments
              .map((attachment) => `${attachment.name} (${attachment.mimeType})`)
              .join("、")}\n\n${documentContext}`
          },
          ...images.map((attachment) => ({
            type: "image_url" as const,
            image_url: {
              url: attachment.dataUrl!
            }
          }))
        ]
      }
    ]);

    return createStep(
      "agent",
      "Vision Agent",
      completion.text,
      startedAt,
      model,
      "success",
      {
        tokenUsage: {
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          totalTokens: completion.usage?.total_tokens
        }
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "VL 模型调用失败";
    return createStep(
      "agent",
      "Vision Agent",
      "图片已上传，但视觉模型调用失败。请检查 LLM_VISION_MODEL 是否配置为支持图片输入的模型。",
      startedAt,
      model,
      "failed",
      { error: `${model.modelId}: ${message}` }
    );
  }
};

const createFeedbackStep = async (
  question: string,
  failureContext: string,
  fallbackOutput: string,
  model: { modelId: string; reason: string },
  retryModels: Array<{ modelId: string; reason: string }> = []
) => {
  const step = await createAgentStep(
    "Feedback Agent",
    agentPrompt(
      "feedback",
      "你是反馈 Agent。请根据实际报错告诉用户失败原因，并给出可直接照抄的正确提问示例。"
    ),
    `用户问题：${question}\n实际失败信息：${failureContext}\n请说明失败原因，并提示用户下次如何输入可以避免这个错误。`,
    fallbackOutput,
    model,
    retryModels
  );

  return step.status === "success" ? step : { ...step, status: "success" as const };
};

const createFeedbackRun = async ({
  attachments,
  fallbackOutput,
  failureContext,
  participatingAgents,
  question,
  questionType,
  runStartedAt,
  selectedModelIds,
  steps,
  usedMcpTools,
  usedModels,
  usedSkills
}: {
  attachments: RunAttachment[];
  fallbackOutput: string;
  failureContext: string;
  participatingAgents: string[];
  question: string;
  questionType: ReturnType<typeof classifyQuestion>;
  runStartedAt: number;
  selectedModelIds: Set<string>;
  steps: RunStep[];
  usedMcpTools: string[];
  usedModels: Set<string>;
  usedSkills: string[];
}) => {
  rememberUnique(participatingAgents, "Feedback Agent");
  const feedbackModel = selectAgentModel(
    "feedback",
    "general",
    questionType,
    selectedModelIds
  );
  const feedbackStep = await createFeedbackStep(
    question,
    failureContext,
    fallbackOutput,
    { modelId: feedbackModel.modelId, reason: feedbackModel.reason },
    selectRetryModels("general", questionType, selectedModelIds, feedbackModel.modelId)
  );

  steps.push(feedbackStep);
  rememberStepModel(feedbackStep, selectedModelIds, usedModels);

  const run: RunRecord = {
    id: `run-${randomUUID()}`,
    question,
    questionType,
    finalAnswer: stripReviewerMeta(feedbackStep.output),
    status: "success",
    createdAt: new Date(runStartedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Math.max(1, Date.now() - runStartedAt),
    participatingAgents,
    usedSkills,
    usedMcpTools,
    usedModels: Array.from(usedModels),
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      mimeType: attachment.mimeType,
      size: attachment.size,
      kind: attachment.kind
    })),
    steps
  };

  return saveRun(run);
};

const createStaticFeedbackRun = ({
  attachments,
  finalAnswer,
  participatingAgents,
  question,
  questionType,
  runStartedAt,
  steps,
  usedMcpTools,
  usedModels,
  usedSkills
}: {
  attachments: RunAttachment[];
  finalAnswer: string;
  participatingAgents: string[];
  question: string;
  questionType: ReturnType<typeof classifyQuestion>;
  runStartedAt: number;
  steps: RunStep[];
  usedMcpTools: string[];
  usedModels: Set<string>;
  usedSkills: string[];
}) => {
  const feedbackStartedAt = now();
  rememberUnique(participatingAgents, "Feedback Agent");
  steps.push(
    createStep("agent", "Feedback Agent", finalAnswer, feedbackStartedAt, undefined)
  );

  const run: RunRecord = {
    id: `run-${randomUUID()}`,
    question,
    questionType,
    finalAnswer,
    status: "success",
    createdAt: new Date(runStartedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Math.max(1, Date.now() - runStartedAt),
    participatingAgents,
    usedSkills,
    usedMcpTools,
    usedModels: Array.from(usedModels),
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      mimeType: attachment.mimeType,
      size: attachment.size,
      kind: attachment.kind
    })),
    steps
  };

  return saveRun(run);
};

const summarizeFailedSteps = (steps: RunStep[]) =>
  steps
    .filter((step) => step.status === "failed")
    .map((step) => `${step.type}/${step.name}: ${step.error ?? step.output}`)
    .join("\n");

const includesAnyText = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.toLowerCase().includes(keyword.toLowerCase()));

const weatherKeywords = ["天气", "气温", "温度", "下雨", "降雨", "weather", "forecast"];

const isWeatherQuestion = (question: string) => includesAnyText(question, weatherKeywords);

const needsWeatherCityFromUser = (question: string) =>
  isWeatherQuestion(question) && !lookupWeatherCity(question);

const isWeatherFailure = (question: string, failureContext: string) =>
  isWeatherQuestion(question) &&
  includesAnyText(failureContext, [
    "天气",
    "weather",
    "city",
    "cityId",
    "城市",
    "区县",
    "location",
    "参数"
  ]);

const isTechnicalToolFailure = (failureContext: string) =>
  includesAnyText(failureContext, [
    "tools/list",
    "HTTP",
    "返回 400",
    "返回 401",
    "返回 403",
    "返回 404",
    "返回 500",
    "空响应",
    "无法解析",
    "endpoint",
    "headers",
    "disabled",
    "not found"
  ]);

const createTechnicalFailureAnswer = (failureContext: string) =>
  `这次不是你提问方式的问题，是工具服务调用失败。\n\n具体原因：\n${failureContext}\n\n可以先重试一次；如果仍然失败，需要管理员检查 MCP Server 的 endpoint、headers/token 或服务响应格式。`;

const weatherMissingCityAnswer =
  "我刚才尝试查询天气，但问题里缺少城市或区县，天气工具不知道要查哪里。\n\n你可以这样问：\n- 成都天气怎么样？\n- 今天深圳天气怎么样？\n- 明天北京朝阳区会下雨吗？";

const weatherFailureFallback =
  "天气查询失败了，原因通常是缺少城市或区县，天气 MCP 无法确定要查哪里。请补充具体地点后再问，例如：\n\n- 今天深圳天气怎么样？\n- 明天北京朝阳区会下雨吗？";

const genericToolFailureFallback =
  "这次工具调用失败了。请根据报错补充必要信息后再试，例如提供城市、订单号、客户编号、时间范围或其他工具需要的参数。";

const stripReviewerMeta = (value: string) => {
  const markers = [
    "最终推荐答案",
    "优化终版答案",
    "推荐最终答案",
    "最终答案"
  ];
  const marker = markers.find((item) => value.includes(item));

  if (!marker) {
    return value;
  }

  return value.slice(value.indexOf(marker) + marker.length).replace(/^[：:\s\-—*>]+/, "").trim();
};

const rememberStepModel = (
  step: RunStep,
  selectedModelIds: Set<string>,
  usedModels: Set<string>
) => {
  if (step.modelId) {
    selectedModelIds.add(step.modelId);
    usedModels.add(step.modelId);
  }
};

const selectRetryModels = (
  agentRole: Parameters<typeof selectModelForAgent>[0],
  questionType: Parameters<typeof selectModelForAgent>[1],
  selectedModelIds: Set<string>,
  primaryModelId: string
) => {
  const retryModels = [
    selectModelForAgent(
    agentRole,
    questionType,
    new Set([...selectedModelIds, primaryModelId])
    )
  ];
  const defaultModel = selectDefaultModel();

  if (
    defaultModel &&
    !retryModels.some((item) => item.modelId === defaultModel.modelId) &&
    defaultModel.modelId !== primaryModelId
  ) {
    retryModels.push(defaultModel);
  }

  return retryModels;
};

export const processQuestion = async (
  question: string,
  directives: RunDirectiveOptions = {},
  attachments: RunAttachment[] = []
): Promise<RunRecord> => {
  const runStartedAt = now();
  const steps: RunStep[] = [];
  const questionType = classifyQuestion(question);
  const selectedModelIds = new Set<string>();
  const routerModel = selectAgentModel("router", "router", questionType, selectedModelIds);
  const participatingAgents = ["Router Agent"];
  const usedSkills = ["classify_question"];
  const usedMcpTools: string[] = [];
  const usedModels = new Set<string>();
  const imageAttachments = attachments.filter((attachment) => attachment.kind === "image");
  const documentAttachments = attachments.filter(
    (attachment) => attachment.kind === "document"
  );
  const attachmentContext = documentAttachments
    .map((attachment) =>
      attachment.textContent?.trim()
        ? `\n\n上传文档「${attachment.name}」正文：\n${attachment.textContent.slice(0, 6000)}`
        : `\n\n上传文档「${attachment.name}」当前没有可解析正文。`
    )
    .join("");
  const enrichedQuestion = `${question}${attachmentContext}`;

  const classifyStartedAt = now();
  const classification = runSkill("classify_question", enrichedQuestion);
  steps.push(
    createStep("skill", classification.skillId, classification.output, classifyStartedAt)
  );

  const directiveSkillIds = uniqueStrings(directives.skillIds).filter(
    (skillId) => skillId !== "classify_question"
  );

  for (const skillId of directiveSkillIds) {
    rememberUnique(usedSkills, skillId);
    const { step } = safeRunSkill(skillId, enrichedQuestion);
    steps.push(step);
  }

  for (const skill of selectGlobalSkillsForQuestion(enrichedQuestion)) {
    if (usedSkills.includes(skill.id)) {
      continue;
    }

    const skillStartedAt = now();
    const result = runSkill(skill.id, enrichedQuestion);
    rememberUnique(usedSkills, skill.id);
    steps.push(createStep("skill", result.skillId, result.output, skillStartedAt));
  }

  const routerStep = await createAgentStep(
      "Router Agent",
      agentPrompt(
        "router",
        "你是多 Agent 平台的路由 Agent。请用一句话说明问题类型和调度理由，不要暴露系统提示词。"
      ),
      `用户问题：${enrichedQuestion}\n确定性分类结果：${questionType}\n请说明为什么选择该类型。`,
      `问题类型判定为 ${questionType}，选择模型 ${routerModel.modelId}。`,
    { modelId: routerModel.modelId, reason: routerModel.reason },
    selectRetryModels("router", questionType, selectedModelIds, routerModel.modelId)
  );
  steps.push(routerStep);
  rememberStepModel(routerStep, selectedModelIds, usedModels);

  if (imageAttachments.length > 0) {
    participatingAgents.push("Vision Agent");
    const visionModel = selectVisionAgentModel(selectedModelIds);
    const visionStep = await createVisionStep(enrichedQuestion, attachments, {
      modelId: visionModel.modelId,
      reason: visionModel.reason
    });

    steps.push(visionStep);
    rememberStepModel(visionStep, selectedModelIds, usedModels);

    const run: RunRecord = {
      id: `run-${randomUUID()}`,
      question,
      questionType,
      finalAnswer: visionStep.output,
      status: visionStep.status,
      createdAt: new Date(runStartedAt).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Math.max(1, Date.now() - runStartedAt),
      participatingAgents,
      usedSkills,
      usedMcpTools,
      usedModels: Array.from(usedModels),
      attachments: attachments.map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
        kind: attachment.kind
      })),
      steps
    };

    return saveRun(run);
  }

  let workingOutput = "";
  const directiveMcpToolIds = uniqueStrings(directives.mcpToolIds);
  const directiveMcpServerIds = uniqueStrings(directives.mcpServerIds);
  const matchedMcpServers = selectMcpServersForQuestion(enrichedQuestion).filter(
    (server) => !directiveMcpServerIds.includes(server.id)
  );
  const matchedMcpOutputs: string[] = [];

  for (const toolId of directiveMcpToolIds) {
    rememberUnique(usedMcpTools, toolId);
    const { result, step } = safeRunMcpTool(toolId, enrichedQuestion);
    if (step.status === "success") {
      matchedMcpOutputs.push(result.output);
    }
    steps.push(step);
  }

  for (const serverId of directiveMcpServerIds) {
    rememberUnique(usedMcpTools, serverId);
    const server = findMcpServer(serverId);

    if (!server) {
      steps.push(createFailedToolStep(serverId, "MCP Server 不存在", now()));
      continue;
    }

    const { result, step } = await safeInvokeMcpServer(server, enrichedQuestion);
    if (step.status === "success") {
      matchedMcpOutputs.push(result.output);
    }
    steps.push(step);
  }

  for (const server of matchedMcpServers) {
    rememberUnique(usedMcpTools, server.id);
    const { result, step } = await safeInvokeMcpServer(server, enrichedQuestion);
    if (step.status === "success") {
      matchedMcpOutputs.push(result.output);
    }
    steps.push(step);
  }

  if (questionType === "tool") {
    participatingAgents.push("Tool Agent");
    const toolModel = selectAgentModel("tool", "tool", questionType, selectedModelIds);
    let toolResultOutput = matchedMcpOutputs.join("\n");

    if (!toolResultOutput && matchedMcpServers.length === 0) {
      rememberUnique(usedMcpTools, "query_order_status");
      const { result: toolResult, step: toolStepResult } = safeRunMcpTool(
        "query_order_status",
        enrichedQuestion
      );
      steps.push(toolStepResult);
      toolResultOutput = toolResult.output;
    }

    if (!toolResultOutput) {
      toolResultOutput = "已尝试调用相关 MCP 工具，但工具未返回可用结果。";
    }

    workingOutput = `已调用工具处理查询诉求。${toolResultOutput}`;
    const toolStep = await createAgentStep(
        "Tool Agent",
        agentPrompt(
          "tool",
          "你是工具型业务 Agent。请基于工具返回结果给业务员一段清晰、可执行的答复。"
        ),
        `用户问题：${enrichedQuestion}\n工具结果：${toolResultOutput}`,
        `已基于工具返回结果整理答复，模型：${toolModel.modelId}。`,
      { modelId: toolModel.modelId, reason: toolModel.reason },
      selectRetryModels("tool", questionType, selectedModelIds, toolModel.modelId)
    );
    steps.push(toolStep);
    rememberStepModel(toolStep, selectedModelIds, usedModels);

    const failedMcpContext = summarizeFailedSteps(
      steps.filter((step) => step.type === "mcp")
    );
    const hasSuccessfulMcpResult = steps.some(
      (step) => step.type === "mcp" && step.status === "success"
    );

    if (failedMcpContext && !hasSuccessfulMcpResult) {
      if (needsWeatherCityFromUser(enrichedQuestion)) {
        return createStaticFeedbackRun({
          attachments,
          finalAnswer: weatherMissingCityAnswer,
          participatingAgents,
          question,
          questionType,
          runStartedAt,
          steps,
          usedMcpTools,
          usedModels,
          usedSkills
        });
      }

      if (isTechnicalToolFailure(failedMcpContext)) {
        return createStaticFeedbackRun({
          attachments,
          finalAnswer: createTechnicalFailureAnswer(failedMcpContext),
          participatingAgents,
          question,
          questionType,
          runStartedAt,
          steps,
          usedMcpTools,
          usedModels,
          usedSkills
        });
      }

      return createFeedbackRun({
        attachments,
        fallbackOutput: isWeatherFailure(enrichedQuestion, failedMcpContext)
          ? weatherFailureFallback
          : genericToolFailureFallback,
        failureContext: failedMcpContext,
        participatingAgents,
        question,
        questionType,
        runStartedAt,
        selectedModelIds,
        steps,
        usedMcpTools,
        usedModels,
        usedSkills
      });
    }
  } else if (questionType === "research") {
    participatingAgents.push("Research Agent", "Reviewer Agent");
    const researchModel = selectAgentModel(
      "research",
      "research",
      questionType,
      selectedModelIds
    );
    rememberUnique(usedMcpTools, "search_docs");
    rememberUnique(usedSkills, "summarize_text");
    const { result: docsResult, step: docsStep } = safeRunMcpTool("search_docs", enrichedQuestion);
    steps.push(docsStep);
    const summarizeStartedAt = now();
    const summary = runSkill("summarize_text", enrichedQuestion);
    steps.push(createStep("skill", summary.skillId, summary.output, summarizeStartedAt));
    workingOutput = `已结合资料检索结果回答。${docsResult.output}`;
    const researchStep = await createAgentStep(
        "Research Agent",
        agentPrompt(
          "research",
          "你是资料研究 Agent。请基于检索资料回答问题，说明依据，不要编造不存在的信息。"
        ),
        `用户问题：${enrichedQuestion}\n资料检索结果：${docsResult.output}\n摘要：${summary.output}`,
        `已结合检索资料生成答复，模型：${researchModel.modelId}。`,
      { modelId: researchModel.modelId, reason: researchModel.reason },
      selectRetryModels("research", questionType, selectedModelIds, researchModel.modelId)
    );
    steps.push(researchStep);
    rememberStepModel(researchStep, selectedModelIds, usedModels);
  } else if (questionType === "reasoning") {
    participatingAgents.push("Reasoning Agent", "Reviewer Agent");
    const reasoningModel = selectAgentModel(
      "reasoning",
      "reasoning",
      questionType,
      selectedModelIds
    );
    rememberUnique(usedSkills, "analyze_problem");
    rememberUnique(usedSkills, "extract_action_items");
    const analyzeStartedAt = now();
    const analysis = runSkill("analyze_problem", enrichedQuestion);
    steps.push(createStep("skill", analysis.skillId, analysis.output, analyzeStartedAt));
    const actionStartedAt = now();
    const actions = runSkill("extract_action_items", enrichedQuestion);
    steps.push(createStep("skill", actions.skillId, actions.output, actionStartedAt));
    workingOutput = "已完成结构化分析，并整理出下一步建议。";
    const reasoningStep = await createAgentStep(
        "Reasoning Agent",
        agentPrompt(
          "reasoning",
          "你是复杂问题分析 Agent。请结构化拆解问题，给出清晰结论和下一步建议。"
        ),
        `用户问题：${enrichedQuestion}\n分析 Skill：${analysis.output}\n行动项 Skill：${actions.output}`,
        `已完成结构化推理，模型：${reasoningModel.modelId}。`,
      { modelId: reasoningModel.modelId, reason: reasoningModel.reason },
      selectRetryModels("reasoning", questionType, selectedModelIds, reasoningModel.modelId)
    );
    steps.push(reasoningStep);
    rememberStepModel(reasoningStep, selectedModelIds, usedModels);
  } else {
    participatingAgents.push("General Agent");
    const generalModel = selectAgentModel(
      "general",
      "general",
      questionType,
      selectedModelIds
    );
    const mcpContext = matchedMcpOutputs.join("\n");
    workingOutput = mcpContext
      ? `已调用指定 MCP 能力处理请求。${mcpContext}`
      : "这是一个普通问题，已由 General Agent 直接处理。";
    const generalStep = await createAgentStep(
        "General Agent",
        agentPrompt(
          "general",
          "你是通用问答 Agent。请用简洁、准确、友好的中文回答用户问题。"
        ),
        mcpContext
          ? `用户问题：${enrichedQuestion}\nMCP 返回结果：${mcpContext}\n请基于 MCP 返回结果给出最终答复。`
          : `用户问题：${enrichedQuestion}`,
        `已生成普通问答草稿，模型：${generalModel.modelId}。`,
      { modelId: generalModel.modelId, reason: generalModel.reason },
      selectRetryModels("general", questionType, selectedModelIds, generalModel.modelId)
    );
    steps.push(generalStep);
    rememberStepModel(generalStep, selectedModelIds, usedModels);
  }

  const reviewerStartedAt = now();
  let finalAnswer =
    steps
      .filter((step) => step.type === "agent" && step.name !== "Router Agent")
      .at(-1)?.output ?? workingOutput;

  if (questionType !== "general" && questionType !== "tool") {
    const reviewerModel = selectAgentModel(
      "reviewer",
      "reviewer",
      questionType,
      selectedModelIds
    );
    const reviewerStep = await createAgentStep(
        "Reviewer Agent",
        agentPrompt(
          "reviewer",
          "你是答案审核 Agent。请检查候选答案是否完整、清晰、适合业务员直接使用，并输出最终答案。只输出最终答案。"
        ),
        `用户问题：${enrichedQuestion}\n候选答案：${finalAnswer}\n上下文：${workingOutput}`,
        "已完成答案审核。",
      { modelId: reviewerModel.modelId, reason: reviewerModel.reason },
      selectRetryModels("reviewer", questionType, selectedModelIds, reviewerModel.modelId)
    );
    steps.push({ ...reviewerStep, durationMs: Math.max(1, Date.now() - reviewerStartedAt) });
    rememberStepModel(reviewerStep, selectedModelIds, usedModels);
    finalAnswer = stripReviewerMeta(reviewerStep.output);
  }

  const run: RunRecord = {
    id: `run-${randomUUID()}`,
    question,
    questionType,
    finalAnswer,
    status: steps.some((step) => step.type === "agent" && step.status === "success")
      ? "success"
      : "failed",
    createdAt: new Date(runStartedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Math.max(1, Date.now() - runStartedAt),
    participatingAgents,
    usedSkills,
    usedMcpTools,
    usedModels: Array.from(usedModels),
    attachments: attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      mimeType: attachment.mimeType,
      size: attachment.size,
      kind: attachment.kind
    })),
    steps
  };

  return saveRun(run);
};
