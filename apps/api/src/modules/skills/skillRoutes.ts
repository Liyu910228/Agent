import { Router } from "express";
import { listSkills, updateSkill } from "./skillRegistry.js";

export const skillRoutes = Router();

skillRoutes.get("/", (_req, res) => {
  res.json({
    skills: listSkills().map(({ run: _run, ...skill }) => skill)
  });
});

skillRoutes.patch("/:id", (req, res) => {
  const { id } = req.params;
  const { description, enabled, name } = req.body as {
    description?: string;
    enabled?: boolean;
    name?: string;
  };

  if (
    typeof enabled !== "boolean" &&
    typeof name !== "string" &&
    typeof description !== "string"
  ) {
    res.status(400).json({ error: "至少需要 enabled、name 或 description" });
    return;
  }

  const skill = updateSkill(id, { description, enabled, name });

  if (!skill) {
    res.status(404).json({ error: "Skill 不存在" });
    return;
  }

  const { run: _run, ...payload } = skill;
  res.json({ skill: payload });
});
