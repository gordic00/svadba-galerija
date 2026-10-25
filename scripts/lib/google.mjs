import { requireEnv } from "./env.mjs";

export const DRIVE_API = "https://www.googleapis.com/drive/v3";

export async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: requireEnv("GOOGLE_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Google nije prihvatio refresh token (${data.error}). Pokreni ponovo: npm run google:token`,
    );
  }
  return data.access_token;
}

/** fetch() against the Drive API that throws with Google's error message. */
export async function drive(token, pathAndQuery, init = {}) {
  const res = await fetch(`${DRIVE_API}${pathAndQuery}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Drive ${res.status}: ${data.error?.message ?? res.statusText}`);
  return data;
}
