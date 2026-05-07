import type { QuestionType } from "./router.js";

export interface RunAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: "image" | "document";
  dataUrl?: string;
  textContent?: string;
}

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
  attachments?: RunAttachment[];
  steps: RunStep[];
}

export interface RunDirectiveOptions {
  skillIds?: string[];
  mcpToolIds?: string[];
  mcpServerIds?: string[];
}
