// Generates EVENT_KEY, the secret in the QR link. Usage: npm run key [-- --force]
import { randomBytes } from "node:crypto";
import { loadEnv, setEnvVar } from "./lib/env.mjs";

loadEnv();

if (process.env.EVENT_KEY && !process.argv.includes("--force")) {
  console.log(`EVENT_KEY već postoji: ${process.env.EVENT_KEY}`);
  console.log("Novi ključ (stari QR kodovi prestaju da rade): npm run key -- --force");
  process.exit(0);
}

const key = randomBytes(18).toString("base64url");
setEnvVar("EVENT_KEY", key);
console.log(`✓ EVENT_KEY=${key} upisan u .env.local`);
