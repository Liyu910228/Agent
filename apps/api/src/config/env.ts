import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config();
dotenv.config({ path: resolve(process.cwd(), "../../.env") });

const readNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: readNumber(process.env.PORT, 8083),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3003",
  llmBaseUrl: process.env.LLM_BASE_URL ?? "",
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmDefaultModel: process.env.LLM_DEFAULT_MODEL ?? "",
  llmVisionModel: process.env.LLM_VISION_MODEL ?? ""
};
