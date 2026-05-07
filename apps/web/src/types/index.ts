export type UserRole = "admin" | "worker";

export interface SessionUser {
  username: string;
  role: UserRole;
}

export interface LoginResponse {
  user: SessionUser;
}

export interface BootstrapStatus {
  agents: number;
  skills: number;
  mcpTools: number;
  modelServiceConfigured: boolean;
}

export type QuestionType = "general" | "research" | "reasoning" | "tool";

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

export interface RunResponse {
  run: RunRecord;
}

export interface RunsResponse {
  runs: RunRecord[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface RunStats {
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  successRate: number;
  averageDurationMs: number;
  totalTokens: number;
  uniqueModelCount: number;
}

export interface RunStatsResponse {
  stats: RunStats;
}

export interface ModelInfo {
  id: string;
  ownedBy?: string;
  created?: number;
  capabilityTags: string[];
  healthStatus?: "available" | "disabled";
  failureCount?: number;
  lastError?: string;
}

export interface ModelListState {
  models: ModelInfo[];
  lastSyncedAt: string | null;
  error: string | null;
  configured: boolean;
  defaultModel: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  prompt: string;
  modelStrategy: "auto" | "fixed";
  fixedModelId?: string;
}

export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  source: "builtin" | "global";
  enabled: boolean;
  provider?: string;
  path?: string;
}

export interface McpToolConfig {
  id: string;
  name: string;
  description: string;
  serverId: string;
  enabled: boolean;
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

export interface AgentsResponse {
  agents: AgentConfig[];
}

export interface AgentResponse {
  agent: AgentConfig;
}

export interface SkillsResponse {
  skills: SkillConfig[];
}

export interface SkillResponse {
  skill: SkillConfig;
}

export interface McpToolsResponse {
  tools: McpToolConfig[];
}

export interface McpToolResponse {
  tool: McpToolConfig;
}

export interface McpServersResponse {
  servers: McpServerConfig[];
}

export interface McpServerResponse {
  server: McpServerConfig;
}

export interface McpServerImportResponse {
  servers: McpServerConfig[];
}

export interface McpServerTestResponse {
  result: McpServerTestResult;
}
