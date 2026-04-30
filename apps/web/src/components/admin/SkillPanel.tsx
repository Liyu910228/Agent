import type { SkillConfig } from "../../types";

interface SkillPanelProps {
  onToggleSkill: (skill: SkillConfig) => void;
  skills: SkillConfig[];
}

function SkillPanel({ onToggleSkill, skills }: SkillPanelProps) {
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
        {skills.map((skill) => (
          <div
            className="rounded-lg border border-slate-200 p-3 text-sm transition hover:border-slate-300 hover:bg-slate-50/60"
            key={skill.id}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 truncate font-medium" title={skill.name}>
                {skill.name}
              </p>
              <button
                className={
                  skill.enabled
                    ? "rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                    : "rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500"
                }
                onClick={() => onToggleSkill(skill)}
                type="button"
              >
                {skill.enabled ? "启用" : "禁用"}
              </button>
            </div>
            <p className="mt-1 line-clamp-2 text-slate-500">{skill.description}</p>
            <p className="mt-2 text-xs text-slate-400">
              {skill.provider === "garden-skills"
                ? "Garden Skills"
                : skill.source === "global"
                  ? "全局 Skill"
                  : "内置 Skill"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default SkillPanel;
