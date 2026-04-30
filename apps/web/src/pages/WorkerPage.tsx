import {
  Bot,
  Command,
  SendHorizonal,
  UserRound
} from "lucide-react";
import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client";
import { MessageContent } from "../components/worker/MessageContent";
import {
  SelectedCommandChips,
  SlashCommandMenu,
  type SlashSelection
} from "../components/worker/SlashCommandMenu";
import WorkerHeader from "../components/worker/WorkerHeader";
import type {
  BootstrapStatus,
  McpServerConfig,
  McpToolConfig,
  SessionUser,
  SkillConfig
} from "../types";
import { formatDateTime } from "../utils/time";

interface WorkerPageProps {
  user: SessionUser;
  status: BootstrapStatus | null;
  onLogout: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

function WorkerPage({ user, status, onLogout }: WorkerPageProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skills, setSkills] = useState<SkillConfig[]>([]);
  const [mcpTools, setMcpTools] = useState<McpToolConfig[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([]);
  const [selectedCommands, setSelectedCommands] = useState<SlashSelection[]>([]);
  const [commandError, setCommandError] = useState("");

  useEffect(() => {
    void Promise.all([
      apiClient.listSkills(),
      apiClient.listMcpTools(),
      apiClient.listMcpServers()
    ])
      .then(([skillResponse, toolResponse, serverResponse]) => {
        setSkills(skillResponse.skills.filter((skill) => skill.enabled));
        setMcpTools(toolResponse.tools.filter((tool) => tool.enabled));
        setMcpServers(
          serverResponse.servers.filter(
            (server) => server.enabled && server.id !== "builtin-simulated"
          )
        );
      })
      .catch((loadError) => {
        setCommandError(
          loadError instanceof Error ? loadError.message : "能力列表加载失败"
        );
      });
  }, []);

  const slashQuery = useMemo(() => {
    const match = question.match(/(?:^|\s)\/([^\s/]*)$/);
    return match ? match[1].toLowerCase() : null;
  }, [question]);

  const commandOptions = useMemo<SlashSelection[]>(() => {
    const skillOptions = skills.map((skill) => ({
      description: skill.description,
      id: skill.id,
      kind: "skill" as const,
      name: skill.name
    }));
    const mcpToolOptions = mcpTools.map((tool) => ({
      description: tool.description,
      id: tool.id,
      kind: "mcpTool" as const,
      name: tool.name
    }));
    const mcpServerOptions = mcpServers.map((server) => ({
      description: server.description ?? `${server.transport} MCP Server`,
      id: server.id,
      kind: "mcpServer" as const,
      name: server.name
    }));

    return [...skillOptions, ...mcpToolOptions, ...mcpServerOptions]
      .filter((option) => {
        if (selectedCommands.some((selected) => selected.id === option.id)) {
          return false;
        }

        if (slashQuery === null) {
          return false;
        }

        const haystack = `${option.name} ${option.id} ${option.description}`.toLowerCase();
        return haystack.includes(slashQuery);
      })
      .slice(0, 8);
  }, [mcpServers, mcpTools, selectedCommands, skills, slashQuery]);

  const clearChat = () => {
    setMessages([]);
    setQuestion("");
    setError("");
    setSelectedCommands([]);
  };

  const removeTrailingSlashCommand = (value: string) =>
    value.replace(/(?:^|\s)\/[^\s/]*$/, "").trimStart();

  const addCommand = (selection: SlashSelection) => {
    setSelectedCommands((current) => [...current, selection]);
    setQuestion((current) => removeTrailingSlashCommand(current));
  };

  const removeCommand = (selectionId: string) => {
    setSelectedCommands((current) =>
      current.filter((selection) => selection.id !== selectionId)
    );
  };

  const handleSubmit = async () => {
    const nextQuestion = question.trim();

    if (!nextQuestion || isSubmitting) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: nextQuestion,
      timestamp: new Date().toISOString()
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setError("");
    setIsSubmitting(true);

    try {
      const response = await apiClient.createRun(nextQuestion, {
        mcpServerIds: selectedCommands
          .filter((selection) => selection.kind === "mcpServer")
          .map((selection) => selection.id),
        mcpToolIds: selectedCommands
          .filter((selection) => selection.kind === "mcpTool")
          .map((selection) => selection.id),
        skillIds: selectedCommands
          .filter((selection) => selection.kind === "skill")
          .map((selection) => selection.id)
      });
      setMessages((current) => [
        ...current,
        {
          id: response.run.id,
          role: "assistant",
          content: response.run.finalAnswer,
          timestamp: response.run.completedAt
        }
      ]);
      setSelectedCommands([]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && slashQuery !== null && commandOptions[0]) {
      event.preventDefault();
      addCommand(commandOptions[0]);
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  const renderAvatar = (role: ChatMessage["role"]) => (
    <div
      className={
        role === "user"
          ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white"
          : "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
      }
      title={role === "user" ? "业务员" : "AI"}
    >
      {role === "user" ? <UserRound size={16} /> : <Bot size={16} />}
    </div>
  );

  return (
    <main className="flex min-h-screen flex-col bg-white text-slate-950">
      <WorkerHeader
        isSubmitting={isSubmitting}
        onClearChat={clearChat}
        onLogout={onLogout}
        status={status}
        user={user}
      />

      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4">
        <div className="flex-1 space-y-5 py-6">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-96 items-center justify-center">
              <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-slate-50 px-6 py-8 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-white text-slate-700 ring-1 ring-slate-200">
                  <Command size={20} />
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">
                  有什么可以帮你处理？
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  直接输入用户问题，系统会自动调用 Agent、Skill 和 MCP。
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-slate-500">
                  <span className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
                    输入 / 指定能力
                  </span>
                  <span className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
                    Enter 发送
                  </span>
                  <span className="rounded-md bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
                    Shift + Enter 换行
                  </span>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                className={
                  message.role === "user"
                    ? "flex items-start justify-end gap-3"
                    : "flex items-start justify-start gap-3"
                }
                key={message.id}
              >
                {message.role === "assistant" ? renderAvatar(message.role) : null}
                <div
                  className={
                    message.role === "user"
                      ? "flex max-w-[78%] flex-col items-end"
                      : "flex max-w-[82%] flex-col items-start"
                  }
                >
                  <time className="mb-1 px-1 text-[11px] text-slate-400">
                    {formatDateTime(message.timestamp)}
                  </time>
                  <article
                    className={
                      message.role === "user"
                        ? "rounded-2xl bg-slate-100 px-4 py-3 text-sm leading-6 shadow-sm"
                        : "whitespace-pre-line rounded-2xl bg-white px-1 py-1 text-sm leading-7 text-slate-800"
                    }
                  >
                    <MessageContent content={message.content} />
                  </article>
                </div>
                {message.role === "user" ? renderAvatar(message.role) : null}
              </div>
            ))
          )}
          {isSubmitting ? (
            <div className="flex items-start justify-start gap-3">
              {renderAvatar("assistant")}
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                正在处理...
              </div>
            </div>
          ) : null}
          {error ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          ) : null}
          {commandError ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {commandError}
            </p>
          ) : null}
        </div>

        <div className="sticky bottom-0 border-t border-slate-100 bg-white py-4">
          <SlashCommandMenu
            onSelect={addCommand}
            options={commandOptions}
            visible={slashQuery !== null}
          />
          <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-lg shadow-slate-200/60">
            <SelectedCommandChips
              onRemove={removeCommand}
              selections={selectedCommands}
            />
            <textarea
              className="max-h-40 min-h-11 flex-1 resize-none border-0 px-2 py-2 text-sm outline-none"
              disabled={isSubmitting}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息，或输入 / 指定 Skill/MCP"
              value={question}
            />
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!question.trim() || isSubmitting}
              onClick={handleSubmit}
              title="发送"
              type="button"
            >
              <SendHorizonal size={18} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default WorkerPage;
