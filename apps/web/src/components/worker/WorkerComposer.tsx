import {
  FileText,
  Image,
  Mic,
  MicOff,
  Paperclip,
  SendHorizonal,
  X
} from "lucide-react";
import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { RunAttachment } from "../../types";
import {
  SelectedCommandChips,
  SlashCommandMenu,
  type SlashSelection
} from "./SlashCommandMenu";

interface WorkerComposerProps {
  activeAccent: string;
  attachments: RunAttachment[];
  commandOptions: SlashSelection[];
  isSubmitting: boolean;
  onAddFiles: (files: FileList) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onQuestionChange: (value: string) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  onRemoveCommand: (selectionId: string) => void;
  onSelectCommand: (selection: SlashSelection) => void;
  onSubmit: () => void;
  question: string;
  selectedCommands: SlashSelection[];
  showSlashMenu: boolean;
}

const formatBytes = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const appendSpeechText = (current: string, transcript: string) => {
  const value = transcript.trim();

  if (!value) {
    return current;
  }

  return current.trim() ? `${current.trimEnd()} ${value}` : value;
};

function WorkerComposer({
  activeAccent,
  attachments,
  commandOptions,
  isSubmitting,
  onAddFiles,
  onKeyDown,
  onQuestionChange,
  onRemoveAttachment,
  onRemoveCommand,
  onSelectCommand,
  onSubmit,
  question,
  selectedCommands,
  showSlashMenu
}: WorkerComposerProps) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [speechError, setSpeechError] = useState("");
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleVoiceInput = () => {
    setSpeechError("");

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionApi =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!SpeechRecognitionApi) {
      setSpeechError("当前浏览器不支持语音输入，请使用 Chrome 或 Edge。");
      return;
    }

    const recognition = new SpeechRecognitionApi();
    recognition.lang = "zh-CN";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map((result) => result[0]?.transcript ?? "")
        .join("")
        .trim();

      if (transcript) {
        onQuestionChange(appendSpeechText(question, transcript));
      }
    };
    recognition.onerror = (event) => {
      setSpeechError(
        event.error === "not-allowed"
          ? "麦克风权限被拒绝，请允许浏览器使用麦克风。"
          : "语音输入失败，请稍后重试。"
      );
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setSpeechError("语音输入启动失败，请稍后重试。");
      setIsListening(false);
    }
  };

  return (
    <>
      <SlashCommandMenu
        onSelect={onSelectCommand}
        options={commandOptions}
        visible={showSlashMenu}
      />
      <div className="rounded-2xl border border-slate-300 bg-white p-2 shadow-[0_20px_40px_-24px_rgba(15,23,42,0.35)]">
        {attachments.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2 border-b border-slate-100 pb-2">
            {attachments.map((attachment) => (
              <span
                className="inline-flex max-w-52 items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 ring-1 ring-slate-200"
                key={attachment.id}
              >
                {attachment.kind === "image" ? (
                  <Image size={14} />
                ) : (
                  <FileText size={14} />
                )}
                <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                <span className="shrink-0 text-slate-400">
                  {formatBytes(attachment.size)}
                </span>
                <button
                  className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  onClick={() => onRemoveAttachment(attachment.id)}
                  title="移除附件"
                  type="button"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <SelectedCommandChips
          onRemove={onRemoveCommand}
          selections={selectedCommands}
        />

        <div className="flex items-end gap-2">
          <label
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:translate-y-px"
            title="上传图片或文档"
          >
            <Paperclip size={18} />
            <input
              accept="image/*,.txt,.md,.csv,.json,.pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              disabled={isSubmitting}
              multiple
              onChange={(event) => {
                if (event.target.files) {
                  onAddFiles(event.target.files);
                }
                event.target.value = "";
              }}
              type="file"
            />
          </label>
          <button
            className={
              isListening
                ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-100 transition hover:bg-rose-100 active:translate-y-px"
                : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:translate-y-px"
            }
            disabled={isSubmitting}
            onClick={toggleVoiceInput}
            title={isListening ? "停止语音输入" : "语音输入"}
            type="button"
          >
            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <textarea
            className="max-h-40 min-h-11 flex-1 resize-none border-0 px-2 py-2 text-sm outline-none"
            disabled={isSubmitting}
            onChange={(event) => onQuestionChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="输入消息，或上传图片/文档后提问"
            value={question}
          />
          <button
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition hover:opacity-90 active:translate-y-px disabled:cursor-not-allowed disabled:bg-slate-300 disabled:active:translate-y-0"
            disabled={(!question.trim() && attachments.length === 0) || isSubmitting}
            onClick={onSubmit}
            style={{ backgroundColor: activeAccent }}
            title="发送"
            type="button"
          >
            <SendHorizonal size={18} />
          </button>
        </div>
        {speechError ? (
          <p className="mt-2 px-1 text-xs text-rose-600">{speechError}</p>
        ) : null}
        {isListening ? (
          <p className="mt-2 px-1 text-xs text-slate-500">正在听写...</p>
        ) : null}
      </div>
    </>
  );
}

export default WorkerComposer;
