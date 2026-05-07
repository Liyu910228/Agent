import { Bot, Command, UserRound } from "lucide-react";
import type { RunAttachment } from "../../types";
import { formatDateTime } from "../../utils/time";
import { MessageContent } from "./MessageContent";
import type { WorkerChatTheme } from "./WorkerSidebar";

export interface ChatMessage {
  content: string;
  id: string;
  role: "user" | "assistant";
  timestamp: string;
  attachments?: RunAttachment[];
}

interface WorkerChatPanelProps {
  commandError: string;
  error: string;
  isSubmitting: boolean;
  messages: ChatMessage[];
  theme: WorkerChatTheme;
}

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

const formatBytes = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const renderAttachments = (attachments: RunAttachment[] = []) => {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 grid gap-2">
      {attachments.map((attachment) =>
        attachment.kind === "image" && attachment.dataUrl ? (
          <img
            alt={attachment.name}
            className="max-h-48 rounded-lg border border-slate-200 object-contain"
            key={attachment.id}
            src={attachment.dataUrl}
          />
        ) : (
          <span
            className="inline-flex max-w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
            key={attachment.id}
          >
            <span className="truncate">{attachment.name}</span>
            <span className="shrink-0 text-slate-400">
              {formatBytes(attachment.size)}
            </span>
          </span>
        )
      )}
    </div>
  );
};

function WorkerChatPanel({
  commandError,
  error,
  isSubmitting,
  messages,
  theme
}: WorkerChatPanelProps) {
  return (
    <div className="flex-1 space-y-5 py-6">
      {messages.length === 0 ? (
        <div className="flex h-full min-h-96 items-center justify-center">
          <div
            className="w-full max-w-2xl rounded-lg border border-slate-200 px-6 py-8 text-center shadow-sm"
            style={{ backgroundColor: theme.panel }}
          >
            <span
              className="mx-auto flex h-11 w-11 items-center justify-center rounded-md bg-white ring-1 ring-slate-200"
              style={{ color: theme.accent }}
            >
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
                    ? "rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm"
                    : "whitespace-pre-line rounded-2xl bg-white px-1 py-1 text-sm leading-7 text-slate-800"
                }
                style={
                  message.role === "user"
                    ? { backgroundColor: theme.userBubble }
                    : undefined
                }
              >
                <MessageContent content={message.content} />
                {renderAttachments(message.attachments)}
              </article>
            </div>
            {message.role === "user" ? renderAvatar(message.role) : null}
          </div>
        ))
      )}
      {isSubmitting ? (
        <div className="flex items-start justify-start gap-3">
          {renderAvatar("assistant")}
          <div
            className="rounded-2xl px-4 py-3 text-sm text-slate-500"
            style={{ backgroundColor: theme.panel }}
          >
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
  );
}

export default WorkerChatPanel;
