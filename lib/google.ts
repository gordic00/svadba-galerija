import type { MediaItem, MediaKind, MediaPage } from "./media";
import { requireEnv } from "./server-config";

// Plain REST calls instead of the googleapis SDK: we only need three endpoints.
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

export class DriveError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly reason?: string,
  ) {
    super(message);
  }
}

async function toDriveError(res: Response, context: string): Promise<DriveError> {
  const body = (await res.json().catch(() => null)) as {
    error?: string | { message?: string; errors?: { reason?: string }[] };
    error_description?: string;
  } | null;
  const err = body?.error;
  const message = typeof err === "string" ? `${err} ${body?.error_description ?? ""}` : err?.message;
  const reason = typeof err === "string" ? err : err?.errors?.[0]?.reason;
  return new DriveError(`${context}: ${res.status} ${message ?? res.statusText}`, res.status, reason);
}

/** Logs a failed Drive call and turns it into a message a guest can understand. */
export function driveFailureResponse(e: unknown): Response {
  console.error(e);
  if (e instanceof DriveError && e.reason === "storageQuotaExceeded") {
    return Response.json(
      { error: "Prostor na Google Drive-u je popunjen. Javite mladencima." },
      { status: 507 },
    );
  }
  return Response.json(
    { error: "Google Drive trenutno ne odgovara. Pokušajte ponovo za minut." },
    { status: 502 },
  );
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: requireEnv("GOOGLE_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw await toDriveError(res, "token refresh");

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

/**
 * Opens a resumable upload session and returns its URL. The browser then PUTs the
 * file straight to Google; passing the page's Origin here is what makes Google
 * answer those cross-origin PUTs with CORS headers.
 */
export async function initResumableUpload(opts: {
  name: string;
  mimeType: string;
  size: number;
  guest: string | null;
  origin: string;
}): Promise<string> {
  const token = await getAccessToken();
  const res = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=resumable&fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": opts.mimeType,
      "X-Upload-Content-Length": String(opts.size),
      Origin: opts.origin,
    },
    body: JSON.stringify({
      name: opts.name,
      parents: [requireEnv("DRIVE_FOLDER_ID")],
      ...(opts.guest && { appProperties: { guest: opts.guest } }),
    }),
  });
  if (!res.ok) throw await toDriveError(res, "init upload");

  const location = res.headers.get("location");
  if (!location) throw new DriveError("init upload: missing Location header", 502);
  return location;
}

interface DriveFile {
  id: string;
  mimeType: string;
  createdTime: string;
  appProperties?: { guest?: string };
  videoMediaMetadata?: { durationMillis?: string };
}

export async function listFolder(opts: { pageToken?: string; kind?: MediaKind }): Promise<MediaPage> {
  const token = await getAccessToken();
  const mimeFilter = opts.kind
    ? `mimeType contains '${opts.kind}/'`
    : "(mimeType contains 'image/' or mimeType contains 'video/')";
  const params = new URLSearchParams({
    q: `'${requireEnv("DRIVE_FOLDER_ID")}' in parents and trashed = false and ${mimeFilter}`,
    orderBy: "createdTime desc",
    pageSize: "60",
    fields: "nextPageToken, files(id, mimeType, createdTime, appProperties, videoMediaMetadata(durationMillis))",
  });
  if (opts.pageToken) params.set("pageToken", opts.pageToken);

  const res = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw await toDriveError(res, "list folder");

  const data = (await res.json()) as { files: DriveFile[]; nextPageToken?: string };
  return {
    items: data.files.map(
      (f): MediaItem => ({
        id: f.id,
        kind: f.mimeType.startsWith("video/") ? "video" : "image",
        guest: f.appProperties?.guest ?? null,
        createdTime: f.createdTime,
        durationMs: f.videoMediaMetadata?.durationMillis
          ? Number(f.videoMediaMetadata.durationMillis)
          : undefined,
      }),
    ),
    nextPageToken: data.nextPageToken ?? null,
  };
}
