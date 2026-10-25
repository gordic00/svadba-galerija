// One-time OAuth login with the Google account that will hold the photos.
// Saves GOOGLE_REFRESH_TOKEN to .env.local. Usage: npm run google:token
import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import http from "node:http";
import { loadEnv, requireEnv, setEnvVar } from "./lib/env.mjs";

loadEnv();
const clientId = requireEnv("GOOGLE_CLIENT_ID");
const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET");

const SCOPE = "https://www.googleapis.com/auth/drive.file";
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const state = randomBytes(16).toString("hex");
let redirectUri = "";

function page(res, status, message) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(`<!doctype html><meta charset="utf-8"><body style="font:18px system-ui;padding:3rem">${message}</body>`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", redirectUri);
  if (url.pathname !== "/") return page(res, 404, "Not found");

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  if (error || !code || url.searchParams.get("state") !== state) {
    page(res, 400, `Prijava nije uspela: ${error ?? "neispravan odgovor"}. Pokreni skriptu ponovo.`);
    console.error(`✗ Prijava nije uspela: ${error ?? "neispravan odgovor"}`);
    server.close();
    process.exitCode = 1;
    return;
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  const tokens = await tokenRes.json();

  if (!tokenRes.ok || !tokens.refresh_token) {
    page(res, 500, "Google nije vratio refresh token. Pogledaj terminal.");
    console.error("✗ Google nije vratio refresh token:", tokens);
    process.exitCode = 1;
  } else {
    setEnvVar("GOOGLE_REFRESH_TOKEN", tokens.refresh_token);
    page(res, 200, "✓ Gotovo! Možeš da zatvoriš ovaj tab i vratiš se u terminal.");
    console.log("✓ GOOGLE_REFRESH_TOKEN upisan u .env.local");
    console.log("  Sledeći korak: npm run drive:setup");
  }
  server.close();
});

// Desktop OAuth clients accept any loopback port, so let the OS pick one.
server.listen(0, "127.0.0.1", () => {
  redirectUri = `http://127.0.0.1:${server.address().port}`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  }).toString();

  console.log("Otvori ovaj link i prijavi se Google nalogom NA KOJI IDU SLIKE:\n");
  console.log(authUrl.href, "\n");
  const opener = process.platform === "darwin" ? "open" : "xdg-open";
  spawn(opener, [authUrl.href], { stdio: "ignore", detached: true }).on("error", () => {});
});
