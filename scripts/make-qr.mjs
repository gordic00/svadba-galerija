// Generates the QR code for printing. Usage: npm run qr -- https://ana-i-marko.vercel.app
import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { loadEnv, requireEnv } from "./lib/env.mjs";

loadEnv();
const key = requireEnv("EVENT_KEY");
const base = process.argv[2];
if (!base) {
  console.error("Upotreba: npm run qr -- https://tvoj-domen.vercel.app");
  process.exit(1);
}

const url = new URL("/", base);
url.searchParams.set("k", key);

const outDir = path.resolve(import.meta.dirname, "../qr");
await fs.mkdir(outDir, { recursive: true });
// Level Q survives ~25% damage: a fold, a smudge or a logo over the middle.
const options = { errorCorrectionLevel: "Q", margin: 2 };
await QRCode.toFile(path.join(outDir, "qr.png"), url.href, { ...options, width: 2000 });
await QRCode.toFile(path.join(outDir, "qr.svg"), url.href, { ...options, type: "svg" });

console.log(`✓ QR kod vodi na: ${url.href}`);
console.log(`  ${path.join(outDir, "qr.png")} (2000×2000 px, za štampu)`);
console.log(`  ${path.join(outDir, "qr.svg")} (vektorski, za dizajnera)`);
