import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readJson, writeJson } from "../../data/jsonStore.js";

export interface SkillResult {
  skillId: string;
  output: string;
}

export interface SkillConfig {
  id: string;
  name: string;
  description: string;
  source: "builtin" | "global";
  enabled: boolean;
  provider?: string;
  path?: string;
  run?: (question: string) => SkillResult;
}

const SKILL_SETTINGS_FILE = "skill-settings.json";
const SKILL_OVERRIDES_FILE = "skill-overrides.json";

const skillEnabledOverrides = new Map<string, boolean>(
  Object.entries(readJson<Record<string, boolean>>(SKILL_SETTINGS_FILE, {}))
);
const skillMetadataOverrides = new Map<
  string,
  Partial<Pick<SkillConfig, "description" | "name">>
>(
  Object.entries(
    readJson<Record<string, Partial<Pick<SkillConfig, "description" | "name">>>>(
      SKILL_OVERRIDES_FILE,
      {}
    )
  )
);

const withEnabled = (skill: Omit<SkillConfig, "enabled">): SkillConfig => ({
  ...skill,
  ...skillMetadataOverrides.get(skill.id),
  enabled: skillEnabledOverrides.get(skill.id) ?? true
});

const builtinSkills: SkillConfig[] = [
  withEnabled({
    id: "classify_question",
    name: "classify_question",
    description: "识别问题类型",
    source: "builtin",
    run: (question) => ({
      skillId: "classify_question",
      output: `已识别问题长度 ${question.length}，进入自动路由。`
    })
  }),
  withEnabled({
    id: "summarize_text",
    name: "summarize_text",
    description: "总结输入文本",
    source: "builtin",
    run: (question) => ({
      skillId: "summarize_text",
      output: `问题摘要：${question.slice(0, 42)}${question.length > 42 ? "..." : ""}`
    })
  }),
  withEnabled({
    id: "analyze_problem",
    name: "analyze_problem",
    description: "分析复杂问题并提取关键因素",
    source: "builtin",
    run: () => ({
      skillId: "analyze_problem",
      output: "已拆分目标、约束、风险和下一步行动。"
    })
  }),
  withEnabled({
    id: "extract_action_items",
    name: "extract_action_items",
    description: "提取行动项",
    source: "builtin",
    run: () => ({
      skillId: "extract_action_items",
      output: "建议先确认背景、补充必要信息，再给出可执行方案。"
    })
  })
];

const codexSkillsRoot = () =>
  process.env.CODEX_HOME
    ? join(process.env.CODEX_HOME, "skills")
    : join(homedir(), ".codex", "skills");

const gardenSkillNames = new Set([
  "gpt-image-2",
  "kb-retriever",
  "web-design-engineer"
]);

const parseFrontmatterValue = (content: string, key: string) => {
  const lines = content.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const prefix = `${key}:`;

    if (!line.startsWith(prefix)) {
      continue;
    }

    const rawValue = line.slice(prefix.length).trim();

    if (rawValue === "|") {
      const blockLines: string[] = [];

      for (let blockIndex = index + 1; blockIndex < lines.length; blockIndex += 1) {
        const blockLine = lines[blockIndex];

        if (blockLine.startsWith("---") || /^[A-Za-z_-]+:\s*/.test(blockLine)) {
          break;
        }

        if (blockLine.trim()) {
          blockLines.push(blockLine.trim());
        }
      }

      return blockLines.join(" ");
    }

    return rawValue.replace(/^["']|["']$/g, "");
  }

  return undefined;
};

const discoverGlobalSkills = (): SkillConfig[] => {
  const root = codexSkillsRoot();

  if (!existsSync(root)) {
    return [];
  }

  const discovered: SkillConfig[] = [];

  for (const entry of readdirSync(root)) {
    const entryPath = join(root, entry);

    if (!statSync(entryPath).isDirectory()) {
      continue;
    }

    const skillPath = join(entryPath, "SKILL.md");

    if (!existsSync(skillPath)) {
      continue;
    }

    const content = readFileSync(skillPath, "utf8");
    const fallbackName = entryPath.split(/[\\/]/).at(-1) ?? "unknown-skill";
    const name = parseFrontmatterValue(content, "name") ?? fallbackName;
    const description =
      parseFrontmatterValue(content, "description") ?? "全局 Codex Skill";

    discovered.push(withEnabled({
      id: `global:${name}`,
      name,
      description,
      source: "global",
      provider: gardenSkillNames.has(name) ? "garden-skills" : "codex-global",
      path: entryPath
    }));
  }

  return discovered;
};

export const listSkills = () => {
  const knownIds = new Set<string>();
  const merged: SkillConfig[] = [];

  for (const skill of [...builtinSkills, ...discoverGlobalSkills()]) {
    if (knownIds.has(skill.id)) {
      continue;
    }

    knownIds.add(skill.id);
    merged.push({
      ...skill,
      ...skillMetadataOverrides.get(skill.id),
      enabled: skillEnabledOverrides.get(skill.id) ?? skill.enabled
    });
  }

  return merged;
};

export const skills = listSkills();

export const setSkillEnabled = (skillId: string, enabled: boolean) => {
  const skill = listSkills().find((item) => item.id === skillId);

  if (!skill) {
    return null;
  }

  skillEnabledOverrides.set(skillId, enabled);
  writeJson(SKILL_SETTINGS_FILE, Object.fromEntries(skillEnabledOverrides));
  return listSkills().find((item) => item.id === skillId) ?? null;
};

export const updateSkill = (
  skillId: string,
  patch: Partial<Pick<SkillConfig, "description" | "enabled" | "name">>
) => {
  const skill = listSkills().find((item) => item.id === skillId);

  if (!skill) {
    return null;
  }

  if (typeof patch.enabled === "boolean") {
    skillEnabledOverrides.set(skillId, patch.enabled);
    writeJson(SKILL_SETTINGS_FILE, Object.fromEntries(skillEnabledOverrides));
  }

  const metadata = {
    ...skillMetadataOverrides.get(skillId)
  };

  if (typeof patch.name === "string") {
    metadata.name = patch.name.trim() || skill.name;
  }

  if (typeof patch.description === "string") {
    metadata.description = patch.description.trim() || skill.description;
  }

  if (metadata.name || metadata.description) {
    skillMetadataOverrides.set(skillId, metadata);
    writeJson(SKILL_OVERRIDES_FILE, Object.fromEntries(skillMetadataOverrides));
  }

  return listSkills().find((item) => item.id === skillId) ?? null;
};

export const selectGlobalSkillsForQuestion = (question: string) => {
  const globalSkills = listSkills().filter(
    (skill) => skill.source === "global" && skill.enabled
  );
  const pickByName = (patterns: RegExp[]) =>
    globalSkills.filter((skill) =>
      patterns.some((pattern) => pattern.test(skill.name.toLowerCase()))
    );

  return globalSkills.filter((skill) => {
    if (/(知识库|资料|文档|检索|rag|kb|knowledge)/i.test(question)) {
      return pickByName([/kb/, /rag/, /retriever/]).some((item) => item.id === skill.id);
    }

    if (/(图片|图像|海报|视觉|image|画图|生成图)/i.test(question)) {
      return pickByName([/image/]).some((item) => item.id === skill.id);
    }

    if (/(页面|前端|网页|dashboard|ui|设计|web)/i.test(question)) {
      return pickByName([/web-design/]).some((item) => item.id === skill.id);
    }

    return false;
  });
};

export const runSkill = (skillId: string, question: string) => {
  const skill = listSkills().find((item) => item.id === skillId);

  if (!skill) {
    throw new Error(`Skill not found: ${skillId}`);
  }

  if (!skill.enabled) {
    throw new Error(`Skill disabled: ${skillId}`);
  }

  if (!skill.run) {
    return {
      skillId: skill.id,
      output: `已匹配全局 Skill「${skill.name}」。该 Skill 已安装在 ${skill.path}，可作为本次任务的能力指引。问题：${question.slice(0, 60)}`
    };
  }

  return skill.run(question);
};
