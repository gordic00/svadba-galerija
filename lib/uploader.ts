// Browser side of Drive's resumable upload protocol:
// https://developers.google.com/drive/api/guides/manage-uploads#resumable
// Our API opens the session; the file goes straight from the phone to Google in
// chunks, so a dropped connection costs at most one chunk.

import { apiErrorMessage, apiFetch } from "./client-api";

// Drive requires chunk sizes in multiples of 256 KiB.
const CHUNK_SIZE = 32 * 256 * 1024; // 8 MiB
const MAX_ATTEMPTS = 8;
const CHUNK_TIMEOUT_MS = 3 * 60_000;

export class UploadError extends Error {}

/** The session URL is no longer valid (Drive keeps them for a week); start over with a new one. */
export class SessionExpiredError extends Error {}

class RetryableError extends Error {}

const EXTENSION_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  dng: "image/x-adobe-dng",
  mp4: "video/mp4",
  m4v: "video/x-m4v",
  mov: "video/quicktime",
  "3gp": "video/3gpp",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
};

/** Some phones hand over files with an empty type; fall back to the extension. */
export function resolveMimeType(file: File): string | null {
  if (/^(image|video)\//.test(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIME[ext] ?? null;
}

/** Exponential backoff that ends early when the phone comes back online or to the foreground. */
function waitBeforeRetry(attempt: number): Promise<void> {
  const delay = Math.min(30_000, 1000 * 2 ** attempt) * (0.8 + Math.random() * 0.4);
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      window.removeEventListener("online", done);
      document.removeEventListener("visibilitychange", onVisible);
      resolve();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") done();
    };
    const timer = setTimeout(done, delay);
    window.addEventListener("online", done);
    document.addEventListener("visibilitychange", onVisible);
  });
}

export async function createUploadSession(
  file: File,
  mimeType: string,
  guest: string,
): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await apiFetch("/api/upload-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, mimeType, size: file.size, guest }),
      });
      if (res.ok) return ((await res.json()) as { sessionUrl: string }).sessionUrl;
      // 507 = Drive is full; retrying won't help.
      if (res.status < 500 || res.status === 507) throw new UploadError(await apiErrorMessage(res));
      if (attempt >= MAX_ATTEMPTS) throw new UploadError(await apiErrorMessage(res));
    } catch (e) {
      if (e instanceof UploadError || attempt >= MAX_ATTEMPTS) throw e;
    }
    await waitBeforeRetry(attempt);
  }
}

interface PutResult {
  status: number;
  range: string | null;
}

function put(url: string, contentRange: string, body: Blob | null, onSent?: (bytes: number) => void) {
  return new Promise<PutResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.timeout = CHUNK_TIMEOUT_MS;
    xhr.setRequestHeader("Content-Range", contentRange);
    if (onSent) xhr.upload.onprogress = (e) => onSent(e.loaded);
    xhr.onload = () => resolve({ status: xhr.status, range: xhr.getResponseHeader("Range") });
    xhr.onerror = () => reject(new RetryableError("network error"));
    xhr.ontimeout = () => reject(new RetryableError("timeout"));
    xhr.send(body);
  });
}

/** "bytes=0-8388607" → 8388608, the offset to continue from. */
function nextOffset(range: string | null): number | null {
  const end = range?.match(/-(\d+)$/)?.[1];
  return end ? Number(end) + 1 : null;
}

function checkStatus(status: number): never {
  if (status === 404 || status === 410) throw new SessionExpiredError();
  if (status === 429 || status >= 500) throw new RetryableError(`HTTP ${status}`);
  throw new UploadError(`Google Drive je odbio fajl (${status}).`);
}

/**
 * Asks Drive how much of the file it already has; null means the upload is complete.
 * Without a readable Range header, fall back to the last offset Drive acknowledged:
 * Range is only missing when Drive has nothing, and then that offset is 0 as well.
 */
async function queryOffset(sessionUrl: string, size: number, acknowledged: number): Promise<number | null> {
  const res = await put(sessionUrl, `bytes */${size}`, null);
  if (res.status === 200 || res.status === 201) return null;
  if (res.status !== 308) checkStatus(res.status);
  return nextOffset(res.range) ?? acknowledged;
}

export async function uploadToSession(
  sessionUrl: string,
  file: File,
  onProgress: (loaded: number) => void,
  resume: boolean,
): Promise<void> {
  let offset = 0;
  let failures = 0;
  let needsQuery = resume;

  while (true) {
    try {
      if (needsQuery) {
        const confirmed = await queryOffset(sessionUrl, file.size, offset);
        if (confirmed === null) return;
        offset = confirmed;
        needsQuery = false;
        onProgress(offset);
      }

      const end = Math.min(offset + CHUNK_SIZE, file.size);
      const start = offset;
      const res = await put(
        sessionUrl,
        `bytes ${start}-${end - 1}/${file.size}`,
        file.slice(start, end),
        (sent) => onProgress(start + sent),
      );

      if (res.status === 200 || res.status === 201) return;
      if (res.status !== 308) checkStatus(res.status);
      // 308 = chunk accepted, keep going. Drive reports what it stored in Range;
      // if the header isn't readable we sent in order, so assume the whole chunk.
      offset = nextOffset(res.range) ?? end;
      failures = 0;
      onProgress(offset);
    } catch (e) {
      if (!(e instanceof RetryableError)) throw e;
      if (++failures >= MAX_ATTEMPTS) {
        throw new UploadError("Veza je prekinuta. Proverite internet i pokušajte ponovo.");
      }
      await waitBeforeRetry(failures);
      needsQuery = true;
    }
  }
}
