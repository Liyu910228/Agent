import { Router } from "express";
import { processQuestion } from "../orchestrator/orchestrator.js";
import { getRunStats, listRuns } from "./runStore.js";

export const runRoutes = Router();

runRoutes.get("/", (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);

  res.json(listRuns(page, pageSize));
});

runRoutes.get("/stats", (_req, res) => {
  res.json({ stats: getRunStats() });
});

runRoutes.post("/", async (req, res) => {
  const { question, directives } = req.body as {
    directives?: {
      mcpServerIds?: string[];
      mcpToolIds?: string[];
      skillIds?: string[];
    };
    question?: string;
  };

  if (!question?.trim()) {
    res.status(400).json({ error: "问题不能为空" });
    return;
  }

  const run = await processQuestion(question.trim(), directives);
  res.json({ run });
});
