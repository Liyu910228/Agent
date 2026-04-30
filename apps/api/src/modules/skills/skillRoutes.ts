import { Router } from "express";
import { listSkills, setSkillEnabled } from "./skillRegistry.js";

export const skillRoutes = Router();

skillRoutes.get("/", (_req, res) => {
  res.json({
    skills: listSkills().map(({ run: _run, ...skill }) => skill)
  });
});

skillRoutes.patch("/:id", (req, res) => {
  const { id } = req.params;
  const { enabled } = req.body as { enabled?: boolean };

  if (typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled 必须是 boolean" });
    return;
  }

  const skill = setSkillEnabled(id, enabled);

  if (!skill) {
    res.status(404).json({ error: "Skill 不存在" });
    return;
  }

  const { run: _run, ...payload } = skill;
  res.json({ skill: payload });
});

