import fs from "node:fs";
import path from "node:path";

export const ENV_PATH = path.resolve(import.meta.dirname, "../../.env.local");

export function loadEnv() {
  if (fs.existsSync(ENV_PATH)) process.loadEnvFile(ENV_PATH);
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`✗ Nedostaje ${name} u .env.local (pogledaj UPUTSTVO.md).`);
    process.exit(1);
  }
  return value;
}

/** Sets NAME=value in .env.local, replacing an existing line or appending a new one. */
export function setEnvVar(name, value) {
  let text = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, "utf8") : "";
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  if (pattern.test(text)) {
    text = text.replace(pattern, () => line);
  } else {
    if (text && !text.endsWith("\n")) text += "\n";
    text += `${line}\n`;
  }
  fs.writeFileSync(ENV_PATH, text);
  process.env[name] = value;
}
