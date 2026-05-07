import { MessageSquare, Palette, Plus } from "lucide-react";
import { formatDateTime } from "../../utils/time";

export interface WorkerChatSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface WorkerChatTheme {
  accent: string;
  background: string;
  id: string;
  name: string;
  panel: string;
  userBubble: string;
}

interface WorkerSidebarProps {
  activeChatId: string;
  activeThemeId: string;
  chats: WorkerChatSummary[];
  onCreateChat: () => void;
  onSelectChat: (chatId: string) => void;
  onThemeChange: (themeId: string) => void;
  themes: WorkerChatTheme[];
}

function WorkerSidebar({
  activeChatId,
  activeThemeId,
  chats,
  onCreateChat,
  onSelectChat,
  onThemeChange,
  themes
}: WorkerSidebarProps) {
  return (
    <aside className="flex max-h-screen w-full shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-950 text-white md:h-screen md:w-72">
      <div className="border-b border-white/10 p-3">
        <button
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 text-sm font-medium hover:bg-white/15"
          onClick={onCreateChat}
          type="button"
        >
          <Plus size={16} />
          New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-slate-400">
          Chats
        </p>
        <div className="space-y-1">
          {chats.map((chat) => (
            <button
              className={
                chat.id === activeChatId
                  ? "flex w-full items-start gap-2 rounded-md bg-white/15 px-2.5 py-2 text-left"
                  : "flex w-full items-start gap-2 rounded-md px-2.5 py-2 text-left text-slate-300 hover:bg-white/10 hover:text-white"
              }
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              type="button"
            >
              <MessageSquare className="mt-0.5 shrink-0" size={15} />
              <span className="min-w-0">
                <span className="block truncate text-sm">{chat.title}</span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  {formatDateTime(chat.updatedAt)}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="mb-3 flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-400">
          <Palette size={14} />
          主题设置
        </div>
        <div className="grid grid-cols-2 gap-2">
          {themes.map((theme) => (
            <button
              className={
                theme.id === activeThemeId
                  ? "rounded-md border border-white/70 bg-white/10 p-2 text-left"
                  : "rounded-md border border-white/10 bg-white/5 p-2 text-left hover:border-white/30"
              }
              key={theme.id}
              onClick={() => onThemeChange(theme.id)}
              type="button"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="h-4 w-4 rounded-full ring-1 ring-white/30"
                  style={{ backgroundColor: theme.accent }}
                />
                <span className="text-xs text-white">{theme.name}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default WorkerSidebar;
