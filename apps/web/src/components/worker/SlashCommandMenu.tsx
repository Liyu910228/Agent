import { Command, Sparkles, Wrench, X } from "lucide-react";

export type SlashSelectionKind = "skill" | "mcpTool" | "mcpServer";

export interface SlashSelection {
  description: string;
  id: string;
  kind: SlashSelectionKind;
  name: string;
}

interface SlashCommandMenuProps {
  onSelect: (selection: SlashSelection) => void;
  options: SlashSelection[];
  visible: boolean;
}

interface SelectedCommandChipsProps {
  onRemove: (selectionId: string) => void;
  selections: SlashSelection[];
}

const commandLabel = (kind: SlashSelectionKind) => {
  if (kind === "skill") {
    return "Skill";
  }

  return kind === "mcpServer" ? "MCP Server" : "MCP";
};

const commandIcon = (kind: SlashSelectionKind, size = 15) =>
  kind === "skill" ? <Sparkles size={size} /> : <Wrench size={size} />;

export function SlashCommandMenu({
  onSelect,
  options,
  visible
}: SlashCommandMenuProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2 text-xs text-slate-500">
        <Command size={14} />
        选择要直接调用的能力
      </div>
      {options.length ? (
        <div className="max-h-64 overflow-auto py-1">
          {options.map((option) => (
            <button
              className="flex w-full items-start gap-3 px-3 py-2 text-left hover:bg-slate-50"
              key={`${option.kind}-${option.id}`}
              onClick={() => onSelect(option)}
              type="button"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                {commandIcon(option.kind)}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  {option.name}
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-normal text-slate-500">
                    {commandLabel(option.kind)}
                  </span>
                </span>
                <span className="line-clamp-2 text-xs leading-5 text-slate-500">
                  {option.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 py-4 text-sm text-slate-500">
          没有匹配的可用 Skill 或 MCP。
        </div>
      )}
    </div>
  );
}

export function SelectedCommandChips({
  onRemove,
  selections
}: SelectedCommandChipsProps) {
  if (!selections.length) {
    return null;
  }

  return (
    <div className="mb-2 flex max-h-20 flex-wrap gap-1.5 overflow-auto pl-1">
      {selections.map((selection) => (
        <span
          className="flex max-w-48 items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
          key={`${selection.kind}-${selection.id}`}
          title={selection.name}
        >
          {commandIcon(selection.kind, 12)}
          <span className="truncate">{selection.name}</span>
          <button
            className="rounded text-slate-400 hover:text-slate-700"
            onClick={() => onRemove(selection.id)}
            title="移除"
            type="button"
          >
            <X size={12} />
          </button>
        </span>
      ))}
    </div>
  );
}
