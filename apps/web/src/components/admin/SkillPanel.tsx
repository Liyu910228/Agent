import type { SkillConfig } from "../../types";

export interface SkillDraft {
  description: string;
  name: string;
}

interface SkillPanelProps {
  editingSkillId: string | null;
  onEditSkill: (skill: SkillConfig) => void;
  onSaveSkill: (id: string) => void;
  onSkillDraftChange: (draft: SkillDraft) => void;
  onToggleSkill: (skill: SkillConfig) => void;
  skillDraft: SkillDraft;
  skills: SkillConfig[];
}

function SkillPanel({
  editingSkillId,
  onEditSkill,
  onSaveSkill,
  onSkillDraftChange,
  onToggleSkill,
  skillDraft,
  skills
}: SkillPanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold">Skill</h2>
          <p className="mt-1 text-xs text-slate-500">内置与全局 Skill 开关。</p>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
          {skills.filter((skill) => skill.enabled).length}/{skills.length} 启用
        </span>
      </div>
      <div className="max-h-[34rem] space-y-2 overflow-auto p-5">
        {skills.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">暂无 Skill</p>
            <p className="mt-1 text-xs text-slate-500">
              全局或内置 Skill 加载后会显示在这里。
            </p>
          </div>
        ) : (
          skills.map((skill) => (
          <div
            className="rounded-lg border border-slate-200 p-3 text-sm transition hover:border-slate-300 hover:bg-slate-50/60"
            key={skill.id}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate font-medium" title={skill.name}>
                {skill.name}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  className={
                    skill.enabled
                      ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 transition active:translate-y-px"
                      : "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500 transition active:translate-y-px"
                  }
                  onClick={() => onToggleSkill(skill)}
                  type="button"
                >
                  {skill.enabled ? "禁用" : "启用"}
                </button>
                {editingSkillId === skill.id ? (
                  <button
                    className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white transition hover:bg-slate-700 active:translate-y-px"
                    onClick={() => onSaveSkill(skill.id)}
                    type="button"
                  >
                    保存
                  </button>
                ) : (
                  <button
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 transition hover:bg-slate-50 active:translate-y-px"
                    onClick={() => onEditSkill(skill)}
                    type="button"
                  >
                    编辑
                  </button>
                )}
              </div>
            </div>
            {editingSkillId === skill.id ? (
              <div className="mt-3 space-y-2">
                <input
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-600"
                  onChange={(event) =>
                    onSkillDraftChange({ ...skillDraft, name: event.target.value })
                  }
                  value={skillDraft.name}
                />
                <textarea
                  className="min-h-20 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-600"
                  onChange={(event) =>
                    onSkillDraftChange({
                      ...skillDraft,
                      description: event.target.value
                    })
                  }
                  value={skillDraft.description}
                />
              </div>
            ) : (
              <p className="mt-1 line-clamp-2 text-slate-500">
                {skill.description}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              {skill.provider === "garden-skills"
                ? "Garden Skills"
                : skill.source === "global"
                  ? "全局 Skill"
                  : "内置 Skill"}
            </p>
          </div>
          ))
        )}
      </div>
    </section>
  );
}

export default SkillPanel;
