import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client";
import WorkerChatPanel, {
  type ChatMessage
} from "../components/worker/WorkerChatPanel";
import WorkerComposer from "../components/worker/WorkerComposer";
import type { SlashSelection } from "../components/worker/SlashCommandMenu";
import WorkerHeader from "../components/worker/WorkerHeader";
import WorkerSidebar, {
  type WorkerChatTheme
} from "../components/worker/WorkerSidebar";
import type {
  BootstrapStatus,
  McpServerConfig,
  McpToolConfig,
  RunAttachment,
  SessionUser,
  SkillConfig
} from "../types";

interface WorkerPageProps {
  user: SessionUser;
  status: BootstrapStatus | null;
  onLogout: () => void;
}

interface ChatThread {
  id: string;
  messages: ChatMessage[];
  themeId: string;
  title: string;
  updatedAt: string;
}

const chatThemes: WorkerChatTheme[] = [
  {
    accent: "#0f172a",
    background: "#ffffff",
    id: "clean",
    name: "默认",
    panel: "#f8fafc",
    userBubble: "#f1f5f9"
  },
  {
    accent: "#047857",
    background: "#f0fdf4",
    id: "green",
    name: "绿意",
    panel: "#ecfdf5",
    userBubble: "#d1fae5"
  },
  {
    accent: "#2563eb",
    background: "#eff6ff",
    id: "blue",
    name: "蓝调",
    panel: "#dbeafe",
    userBubble: "#bfdbfe"
  },
  {
    accent: "#be123c",
    background: "#fff1f2",
    id: "rose",
    name: "玫瑰",
    panel: "#ffe4e6",
    userBubble: "#fecdd3"
  }
];

const WORKER_CHATS_KEY = "agent-platform-worker-chats";
const WORKER_ACTIVE_CHAT_KEY = "agent-platform-worker-active-chat";
const MAX_UPLOAD_FILES = 4;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const createChatThread = (themeId = "clean"): ChatThread => {
  const now = new Date().toISOString();

  return {
    id: `chat-${Date.now()}`,
    messages: [],
    themeId,
    title: "New chat",
    updatedAt: now
  };
};

const readChatThreads = () => {
  const raw = window.localStorage.getItem(WORKER_CHATS_KEY);

  if (!raw) {
    return [createChatThread()];
  }

  try {
    const parsed = JSON.parse(raw) as ChatThread[];
    return parsed.length ? parsed : [createChatThread()];
  } catch {
    window.localStorage.removeItem(WORKER_CHATS_KEY);
    return [createChatThread()];
  }
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });

const readTextIfPossible = async (file: File) => {
  const isTextLike =
    file.type.startsWith("text/") ||
    [".txt", ".md", ".csv", ".json"].some((suffix) =>
      file.name.toLowerCase().endsWith(suffix)
    );

  return isTextLike ? file.text() : undefined;
};

function WorkerPage({ user, status, onLogout }: WorkerPageProps) {
  const [chats, setChats] = useState<ChatThread[]>(() => readChatThreads());
  const [activeChatId, setActiveChatId] = useState(() => {
    const storedChatId = window.localStorage.getItem(WORKER_ACTIVE_CHAT_KEY);
    return storedChatId || chats[0].id;
  });
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [skills, setSkills] = useState<SkillConfig[]>([]);
  const [mcpTools, setMcpTools] = useState<McpToolConfig[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([]);
  const [selectedCommands, setSelectedCommands] = useState<SlashSelection[]>([]);
  const [attachments, setAttachments] = useState<RunAttachment[]>([]);
  const [commandError, setCommandError] = useState("");
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<
    string | null
  >(null);
  const activeChat = chats.find((chat) => chat.id === activeChatId) ?? chats[0];
  const activeTheme =
    chatThemes.find((theme) => theme.id === activeChat.themeId) ?? chatThemes[0];
  const messages = activeChat.messages;

  useEffect(() => {
    if (!chats.some((chat) => chat.id === activeChatId)) {
      setActiveChatId(chats[0].id);
    }
  }, [activeChatId, chats]);

  useEffect(() => {
    window.localStorage.setItem(WORKER_CHATS_KEY, JSON.stringify(chats));
    window.localStorage.setItem(WORKER_ACTIVE_CHAT_KEY, activeChat.id);
  }, [activeChat.id, chats]);

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
    const nextChat = createChatThread(activeTheme.id);

    setChats((current) => [nextChat, ...current]);
    setActiveChatId(nextChat.id);
    setQuestion("");
    setError("");
    setSelectedCommands([]);
    setAttachments([]);
  };

  const updateActiveChat = (updater: (chat: ChatThread) => ChatThread) => {
    setChats((current) =>
      current.map((chat) => (chat.id === activeChatId ? updater(chat) : chat))
    );
  };

  const updateChat = (
    chatId: string,
    updater: (chat: ChatThread) => ChatThread
  ) => {
    setChats((current) =>
      current.map((chat) => (chat.id === chatId ? updater(chat) : chat))
    );
  };

  const setActiveChatTheme = (themeId: string) => {
    updateActiveChat((chat) => ({ ...chat, themeId }));
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

  const addFiles = async (files: FileList) => {
    setError("");
    const remainingSlots = MAX_UPLOAD_FILES - attachments.length;
    const selectedFiles = Array.from(files).slice(0, remainingSlots);

    if (selectedFiles.length === 0) {
      setError(`最多上传 ${MAX_UPLOAD_FILES} 个附件。`);
      return;
    }

    try {
      const nextAttachments = await Promise.all(
        selectedFiles.map(async (file) => {
          if (file.size > MAX_UPLOAD_BYTES) {
            throw new Error(`${file.name} 超过 5MB，暂不支持上传。`);
          }

          const isImage = file.type.startsWith("image/");
          const textContent = isImage ? undefined : await readTextIfPossible(file);

          return {
            id: `attachment-${Date.now()}-${file.name}`,
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            size: file.size,
            kind: isImage ? "image" : "document",
            dataUrl: isImage ? await readFileAsDataUrl(file) : undefined,
            textContent
          } satisfies RunAttachment;
        })
      );

      setAttachments((current) => [...current, ...nextAttachments]);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "附件读取失败");
    }
  };

  const removeAttachment = (attachmentId: string) => {
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId)
    );
  };

  const handleSubmit = async () => {
    const rawQuestion = question.trim();

    if ((!rawQuestion && attachments.length === 0) || isSubmitting) {
      return;
    }

    const nextQuestion = rawQuestion || "请分析我上传的附件。";
    const submittedAttachments = attachments;
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: nextQuestion,
      timestamp: new Date().toISOString(),
      attachments: submittedAttachments
    };
    const submittedChatId = activeChat.id;

    updateChat(submittedChatId, (chat) => ({
      ...chat,
      messages: [...chat.messages, userMessage],
      title: chat.messages.length ? chat.title : nextQuestion.slice(0, 28),
      updatedAt: userMessage.timestamp
    }));
    setQuestion("");
    setError("");
    setAttachments([]);
    setIsSubmitting(true);

    try {
      const response = await apiClient.createRun(
        nextQuestion,
        {
          mcpServerIds: selectedCommands
            .filter((selection) => selection.kind === "mcpServer")
            .map((selection) => selection.id),
          mcpToolIds: selectedCommands
            .filter((selection) => selection.kind === "mcpTool")
            .map((selection) => selection.id),
          skillIds: selectedCommands
            .filter((selection) => selection.kind === "skill")
            .map((selection) => selection.id)
        },
        submittedAttachments
      );
      const assistantMessage: ChatMessage = {
        id: response.run.id,
        role: "assistant",
        content: response.run.finalAnswer,
        timestamp: response.run.completedAt
      };

      updateChat(submittedChatId, (chat) => ({
        ...chat,
        messages: [...chat.messages, assistantMessage],
        updatedAt: assistantMessage.timestamp
      }));
      setSelectedCommands([]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerate = async (assistantMessageId: string) => {
    if (isSubmitting || regeneratingMessageId) {
      return;
    }

    const submittedChatId = activeChat.id;
    const assistantIndex = activeChat.messages.findIndex(
      (message) => message.id === assistantMessageId
    );
    const userMessage = activeChat.messages
      .slice(0, assistantIndex)
      .reverse()
      .find((message) => message.role === "user");

    if (!userMessage) {
      setError("没有找到可重新生成的用户问题。");
      return;
    }

    setError("");
    setRegeneratingMessageId(assistantMessageId);

    try {
      const response = await apiClient.createRun(
        userMessage.content,
        undefined,
        userMessage.attachments
      );
      const nextTimestamp =
        response.run.completedAt || response.run.createdAt || new Date().toISOString();

      updateChat(submittedChatId, (chat) => ({
        ...chat,
        messages: chat.messages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: response.run.finalAnswer,
                id: response.run.id,
                timestamp: nextTimestamp
              }
            : message
        ),
        updatedAt: nextTimestamp
      }));
    } catch (regenerateError) {
      setError(
        regenerateError instanceof Error ? regenerateError.message : "重新生成失败"
      );
    } finally {
      setRegeneratingMessageId(null);
    }
  };

  const handleRegenerateFromUser = async (userMessageId: string) => {
    if (isSubmitting || regeneratingMessageId) {
      return;
    }

    const submittedChatId = activeChat.id;
    const userIndex = activeChat.messages.findIndex(
      (message) => message.id === userMessageId
    );
    const userMessage = activeChat.messages[userIndex];

    if (!userMessage || userMessage.role !== "user") {
      setError("没有找到可重新生成的用户问题。");
      return;
    }

    const nextAssistant = activeChat.messages
      .slice(userIndex + 1)
      .find((message) => message.role === "assistant");

    setError("");
    setRegeneratingMessageId(userMessageId);

    try {
      const response = await apiClient.createRun(
        userMessage.content,
        undefined,
        userMessage.attachments
      );
      const nextTimestamp =
        response.run.completedAt || response.run.createdAt || new Date().toISOString();
      const assistantMessage: ChatMessage = {
        id: response.run.id,
        role: "assistant",
        content: response.run.finalAnswer,
        timestamp: nextTimestamp
      };

      updateChat(submittedChatId, (chat) => {
        if (nextAssistant) {
          return {
            ...chat,
            messages: chat.messages.map((message) =>
              message.id === nextAssistant.id ? assistantMessage : message
            ),
            updatedAt: nextTimestamp
          };
        }

        return {
          ...chat,
          messages: [
            ...chat.messages.slice(0, userIndex + 1),
            assistantMessage,
            ...chat.messages.slice(userIndex + 1)
          ],
          updatedAt: nextTimestamp
        };
      });
    } catch (regenerateError) {
      setError(
        regenerateError instanceof Error ? regenerateError.message : "重新生成失败"
      );
    } finally {
      setRegeneratingMessageId(null);
    }
  };

  const handleEditMessage = (messageId: string, content: string) => {
    const editedAt = new Date().toISOString();

    updateActiveChat((chat) => {
      const nextMessages = chat.messages.map((message) =>
        message.id === messageId
          ? { ...message, content, timestamp: editedAt }
          : message
      );
      const firstMessage = nextMessages[0];

      return {
        ...chat,
        messages: nextMessages,
        title:
          firstMessage?.id === messageId && firstMessage.role === "user"
            ? content.slice(0, 28)
            : chat.title,
        updatedAt: editedAt
      };
    });
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

  return (
    <main className="flex min-h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-white text-slate-950 md:flex-row">
      <WorkerSidebar
        activeChatId={activeChat.id}
        activeThemeId={activeChat.themeId}
        chats={chats.map((chat) => ({
          id: chat.id,
          title: chat.title,
          updatedAt: chat.updatedAt
        }))}
        onCreateChat={clearChat}
        onSelectChat={setActiveChatId}
        onThemeChange={setActiveChatTheme}
        themes={chatThemes}
      />

      <section
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
        style={{ backgroundColor: activeTheme.background }}
      >
        <WorkerHeader
          accentColor={activeTheme.accent}
          isSubmitting={isSubmitting}
          onClearChat={clearChat}
          onLogout={onLogout}
          status={status}
          user={user}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col">
              <WorkerChatPanel
                commandError={commandError}
                error={error}
                isSubmitting={isSubmitting}
                messages={messages}
                onEditMessage={handleEditMessage}
                onRegenerate={handleRegenerate}
                onRegenerateFromUser={handleRegenerateFromUser}
                regeneratingMessageId={regeneratingMessageId}
                theme={activeTheme}
              />
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-100 px-4 py-4">
            <div className="mx-auto w-full max-w-4xl">
              <WorkerComposer
                activeAccent={activeTheme.accent}
                attachments={attachments}
                commandOptions={commandOptions}
                isSubmitting={isSubmitting}
                onAddFiles={addFiles}
                onKeyDown={handleKeyDown}
                onQuestionChange={setQuestion}
                onRemoveAttachment={removeAttachment}
                onRemoveCommand={removeCommand}
                onSelectCommand={addCommand}
                onSubmit={handleSubmit}
                question={question}
                selectedCommands={selectedCommands}
                showSlashMenu={slashQuery !== null}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default WorkerPage;
