import {
  Bot,
  Check,
  Clipboard,
  Command,
  Pencil,
  RotateCcw,
  Save,
  UserRound
} from "lucide-react";
import { useState } from "react";
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
  onEditMessage: (messageId: string, content: string) => void;
  onRegenerate: (messageId: string) => void;
  onRegenerateFromUser: (messageId: string) => void;
  regeneratingMessageId: string | null;
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

const writeClipboardText = async (content: string) => {
  if (window.navigator.clipboard?.writeText) {
    await window.navigator.clipboard.writeText(content);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = content;
  textarea.style.left = "-9999px";
  textarea.style.position = "fixed";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

function WorkerChatPanel({
  commandError,
  error,
  isSubmitting,
  messages,
  onEditMessage,
  onRegenerate,
  onRegenerateFromUser,
  regeneratingMessageId,
  theme
}: WorkerChatPanelProps) {
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const copyMessage = async (message: ChatMessage) => {
    const attachmentNames = (message.attachments ?? [])
      .map((attachment) => `[附件] ${attachment.name}`)
      .join("\n");
    const content = [message.content, attachmentNames].filter(Boolean).join("\n\n");

    try {
      await writeClipboardText(content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId(null), 1400);
    } catch {
      setCopiedMessageId(null);
    }
  };

  const startEditMessage = (message: ChatMessage) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };

  const cancelEditMessage = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const saveEditMessage = (messageId: string) => {
    const nextContent = editingContent.trim();

    if (!nextContent) {
      return;
    }

    onEditMessage(messageId, nextContent);
    cancelEditMessage();
  };

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
              <div
                className={
                  message.role === "user"
                    ? "mb-1 flex items-center gap-1 self-end px-1"
                    : "mb-1 flex items-center gap-1 self-start px-1"
                }
              >
                <time className="text-[11px] text-slate-400">
                  {formatDateTime(message.timestamp)}
                </time>
                <button
                  className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-slate-700 active:translate-y-px"
                  onClick={() => void copyMessage(message)}
                  title={copiedMessageId === message.id ? "已复制" : "复制内容"}
                  type="button"
                >
                  {copiedMessageId === message.id ? (
                    <Check size={13} />
                  ) : (
                    <Clipboard size={13} />
                  )}
                </button>
                {message.role === "assistant" ? (
                  <button
                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-slate-700 active:translate-y-px disabled:cursor-wait disabled:text-slate-300 disabled:active:translate-y-0"
                    disabled={isSubmitting || regeneratingMessageId === message.id}
                    onClick={() => onRegenerate(message.id)}
                    title={
                      regeneratingMessageId === message.id
                        ? "正在重新生成"
                        : "重新生成"
                    }
                    type="button"
                  >
                    <RotateCcw
                      className={
                        regeneratingMessageId === message.id
                          ? "animate-spin"
                          : undefined
                      }
                      size={13}
                    />
                  </button>
                ) : null}
                {message.role === "user" ? (
                  <>
                    <button
                      className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-slate-700 active:translate-y-px disabled:cursor-not-allowed disabled:text-slate-300 disabled:active:translate-y-0"
                      disabled={isSubmitting || regeneratingMessageId === message.id}
                      onClick={() => onRegenerateFromUser(message.id)}
                      title={
                        regeneratingMessageId === message.id
                          ? "正在重新生成"
                          : "用这条输入重新生成"
                      }
                      type="button"
                    >
                      <RotateCcw
                        className={
                          regeneratingMessageId === message.id
                            ? "animate-spin"
                            : undefined
                        }
                        size={13}
                      />
                    </button>
                    <button
                      className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition hover:bg-white hover:text-slate-700 active:translate-y-px disabled:cursor-not-allowed disabled:text-slate-300 disabled:active:translate-y-0"
                      disabled={isSubmitting || editingMessageId === message.id}
                      onClick={() => startEditMessage(message)}
                      title="编辑输入"
                      type="button"
                    >
                      <Pencil size={13} />
                    </button>
                  </>
                ) : null}
              </div>
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
                {editingMessageId === message.id ? (
                  <div className="grid gap-2">
                    <textarea
                      className="min-h-24 w-80 max-w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-slate-600"
                      onChange={(event) => setEditingContent(event.target.value)}
                      value={editingContent}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        className="flex h-8 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-600 transition hover:bg-slate-50 active:translate-y-px"
                        onClick={cancelEditMessage}
                        type="button"
                      >
                        取消
                      </button>
                      <button
                        className="flex h-8 items-center gap-1 rounded-md bg-slate-900 px-2.5 text-xs font-medium text-white transition hover:bg-slate-700 active:translate-y-px disabled:cursor-not-allowed disabled:bg-slate-300 disabled:active:translate-y-0"
                        disabled={!editingContent.trim()}
                        onClick={() => saveEditMessage(message.id)}
                        type="button"
                      >
                        <Save size={13} />
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <MessageContent content={message.content} />
                    {renderAttachments(message.attachments)}
                  </>
                )}
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
            className="w-full max-w-md rounded-2xl px-4 py-3"
            style={{ backgroundColor: theme.panel }}
          >
            <div className="agent-shimmer h-3 w-24 rounded bg-slate-200" />
            <div className="agent-shimmer mt-3 h-3 w-full rounded bg-slate-200" />
            <div className="agent-shimmer mt-2 h-3 w-2/3 rounded bg-slate-200" />
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
