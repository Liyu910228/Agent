import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { authRoutes } from "./modules/auth/authRoutes.js";
import { agentRoutes } from "./modules/agents/agentRoutes.js";
import { agents } from "./modules/agents/agentRegistry.js";
import { mcpRoutes } from "./modules/mcp/mcpRoutes.js";
import { listMcpTools } from "./modules/mcp/mcpRegistry.js";
import { modelRoutes } from "./modules/models/modelRoutes.js";
import { runRoutes } from "./modules/runs/runRoutes.js";
import { listSkills } from "./modules/skills/skillRegistry.js";
import { skillRoutes } from "./modules/skills/skillRoutes.js";

const app = express();

app.use(
  cors({
    origin: env.webOrigin,
    credentials: true
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "multi-agent-api",
    port: env.port
  });
});

app.get("/api/bootstrap", (_req, res) => {
  res.json({
    agents: agents.length,
    skills: listSkills().length,
    mcpTools: listMcpTools().length,
    modelServiceConfigured: Boolean(env.llmBaseUrl && env.llmApiKey)
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/agents", agentRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/mcp", mcpRoutes);
app.use("/api/models", modelRoutes);
app.use("/api/runs", runRoutes);

app.listen(env.port, () => {
  console.log(`API server listening on http://localhost:${env.port}`);
});
