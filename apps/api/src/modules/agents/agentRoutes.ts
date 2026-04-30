import { Router } from "express";
import { agents, updateAgent } from "./agentRegistry.js";

export const agentRoutes = Router();

agentRoutes.get("/", (_req, res) => {
  res.json({ agents });
});

agentRoutes.patch("/:id", (req, res) => {
  const { id } = req.params;
  const { role, prompt, modelStrategy, fixedModelId } = req.body as {
    role?: string;
    prompt?: string;
    modelStrategy?: "auto" | "fixed";
    fixedModelId?: string;
  };

  const updated = updateAgent(id, { role, prompt, modelStrategy, fixedModelId });

  if (!updated) {
    res.status(404).json({ error: "Agent 不存在" });
    return;
  }

  res.json({ agent: updated });
});
