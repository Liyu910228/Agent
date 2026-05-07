import { Router } from "express";
import { processQuestion } from "../orchestrator/orchestrator.js";
import type { RunAttachment } from "../orchestrator/runTypes.js";
import { getRunStats, listRuns } from "./runStore.js";

export const runRoutes = Router();

const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const sanitizeAttachments = (value: unknown): RunAttachment[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, MAX_ATTACHMENTS).flatMap((item, index) => {
    const attachment = item as Partial<RunAttachment>;
    const mimeType = String(attachment.mimeType ?? "application/octet-stream");
    const kind = mimeType.startsWith("image/") ? "image" : "document";
    const size = Number(attachment.size ?? 0);

    if (!Number.isFinite(size) || size > MAX_ATTACHMENT_BYTES) {
      return [];
    }

    return [{
      id: String(attachment.id ?? `attachment-${index}`),
      name: String(attachment.name ?? `attachment-${index + 1}`),
      mimeType,
      size,
      kind,
      dataUrl:
        kind === "image" && typeof attachment.dataUrl === "string"
          ? attachment.dataUrl
          : undefined,
      textContent:
        kind === "document" && typeof attachment.textContent === "string"
          ? attachment.textContent.slice(0, 12000)
          : undefined
    }];
  });
};

runRoutes.get("/", (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 10);

  res.json(listRuns(page, pageSize));
});

runRoutes.get("/stats", (_req, res) => {
  res.json({ stats: getRunStats() });
});

runRoutes.post("/", async (req, res) => {
  const { question, directives, attachments } = req.body as {
    attachments?: unknown;
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

  const run = await processQuestion(
    question.trim(),
    directives,
    sanitizeAttachments(attachments)
  );
  res.json({ run });
});
