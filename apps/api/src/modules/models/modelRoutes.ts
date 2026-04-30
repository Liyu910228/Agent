import { Router } from "express";
import { getModelState, refreshModels } from "./modelClient.js";

export const modelRoutes = Router();

modelRoutes.get("/", (_req, res) => {
  res.json(getModelState());
});

modelRoutes.post("/refresh", async (_req, res) => {
  try {
    const state = await refreshModels();
    res.json(state);
  } catch (error) {
    res.status(400).json({
      ...getModelState(),
      error: error instanceof Error ? error.message : "模型列表获取失败"
    });
  }
});

