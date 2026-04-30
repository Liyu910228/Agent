import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dataRoot = fileURLToPath(new URL("../../../../data", import.meta.url));

const ensureDir = (path: string) => {
  const dir = dirname(path);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

export const readJson = <T>(name: string, fallback: T): T => {
  const path = join(dataRoot, name);

  if (!existsSync(path)) {
    return fallback;
  }

  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
};

export const writeJson = <T>(name: string, value: T) => {
  const path = join(dataRoot, name);
  ensureDir(path);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

