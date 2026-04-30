import type { QuestionType } from "./router.js";

export interface RunStep {
  id: string;
  type: "agent" | "skill" | "mcp";
  name: string;
  status: "success" | "failed";
  output: string;
  durationMs: number;
  modelId?: string;
  modelReason?: string;
  error?: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface RunRecord {
  id: string;
  question: string;
  questionType: QuestionType;
  finalAnswer: string;
  status: "success" | "failed";
  createdAt: string;
  completedAt: string;
  durationMs: number;
  participatingAgents: string[];
  usedSkills: string[];
  usedMcpTools: string[];
  usedModels: string[];
  steps: RunStep[];
}

export interface RunDirectiveOptions {
  skillIds?: string[];
  mcpToolIds?: string[];
  mcpServerIds?: string[];
}
