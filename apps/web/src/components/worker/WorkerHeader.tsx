import { Bot, LogOut, Plus } from "lucide-react";
import type { BootstrapStatus, SessionUser } from "../../types";

interface WorkerHeaderProps {
  accentColor: string;
  isSubmitting: boolean;
  onClearChat: () => void;
  onLogout: () => void;
  status: BootstrapStatus | null;
  user: SessionUser;
}

function WorkerHeader({
  accentColor,
  isSubmitting,
  onClearChat,
  onLogout,
  status,
  user
}: WorkerHeaderProps) {
  return (
    <header className="z-20 shrink-0 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
            <Bot size={18} />
          </span>
          <div className="min-w-0">
            <h1 className="text-base font-semibold">业务问答</h1>
            <p className="truncate text-xs text-slate-500">
              {user.username} · {status?.mcpTools ?? "-"} MCP · {status?.skills ?? "-"} Skill
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm transition hover:bg-slate-100 active:translate-y-px disabled:cursor-not-allowed disabled:text-slate-400 disabled:active:translate-y-0"
            disabled={isSubmitting}
            onClick={onClearChat}
            type="button"
          >
            <Plus size={16} style={{ color: accentColor }} />
            New chat
          </button>
          <button
            className="flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm transition hover:bg-slate-100 active:translate-y-px"
            onClick={onLogout}
            type="button"
          >
            <LogOut size={16} />
            退出
          </button>
        </div>
      </div>
    </header>
  );
}

export default WorkerHeader;
