import fs from "node:fs";
import { velqConfigSchema, type VelqConfig } from "@velq/shared";
import { resolveVelqConfigPath } from "./paths.js";

export function readConfigFile(): VelqConfig | null {
  const configPath = resolveVelqConfigPath();

  if (!fs.existsSync(configPath)) return null;

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    return velqConfigSchema.parse(raw);
  } catch {
    return null;
  }
}
