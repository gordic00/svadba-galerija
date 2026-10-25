import type { MediaKind } from "./media";
import {
  SessionExpiredError,
  UploadError,
  createUploadSession,
  resolveMimeType,
  uploadToSession,
} from "./uploader";

export type UploadStatus = "queued" | "uploading" | "done" | "error";

export interface UploadItem {
  id: number;
  name: string;
  size: number;
  kind: MediaKind;
  previewUrl: string | null;
  status: UploadStatus;
  loaded: number;
  error: string | null;
  /** False for files rejected up front (wrong format, too big): retrying can't help. */
  retryable: boolean;
}

interface Job {
  file: File;
  mimeType: string;
  guest: string;
  sessionUrl: string | null;
}

const CONCURRENCY = 2;
const NOTIFY_INTERVAL_MS = 150;

/**
 * Upload queue that lives for the whole page session (a module singleton, read in
 * React via useSyncExternalStore), so uploads keep going when the guest switches
 * to the gallery mid-upload.
 */
class UploadQueue {
  private items: readonly UploadItem[] = [];
  private jobs = new Map<number, Job>();
  private listeners = new Set<() => void>();
  private nextId = 1;
  private running = 0;
  private notifyTimer: ReturnType<typeof setTimeout> | null = null;
  private busy = false;
  private wakeLock: WakeLockSentinel | null = null;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.items;

  add(files: File[], opts: { guest: string; maxFileBytes: number }) {
    const added = files.map((file): UploadItem => {
      const id = this.nextId++;
      const mimeType = resolveMimeType(file);
      const error = !mimeType
        ? "Ovaj format nije podržan."
        : file.size === 0
          ? "Fajl je prazan."
          : file.size > opts.maxFileBytes
            ? `Fajl je veći od ${Math.round(opts.maxFileBytes / 1024 ** 2)} MB.`
            : null;
      if (mimeType && !error) {
        this.jobs.set(id, { file, mimeType, guest: opts.guest, sessionUrl: null });
      }
      const kind: MediaKind = mimeType?.startsWith("video/") ? "video" : "image";
      return {
        id,
        name: file.name,
        size: file.size,
        kind,
        previewUrl: kind === "image" && !error ? URL.createObjectURL(file) : null,
        status: error ? "error" : "queued",
        loaded: 0,
        error,
        retryable: !error,
      };
    });
    this.items = [...this.items, ...added];
    this.notify(true);
    this.pump();
  }

  retry(id: number) {
    if (!this.jobs.has(id)) return;
    this.update(id, { status: "queued", error: null });
    this.pump();
  }

  clearFinished() {
    for (const item of this.items) {
      if (item.status === "done" && item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    }
    this.items = this.items.filter((i) => i.status !== "done");
    this.notify(true);
  }

  private pump() {
    while (this.running < CONCURRENCY) {
      const next = this.items.find((i) => i.status === "queued");
      if (!next) break;
      this.running++;
      this.update(next.id, { status: "uploading" });
      void this.run(next.id).finally(() => {
        this.running--;
        this.pump();
      });
    }
    this.syncBusy();
  }

  private async run(id: number) {
    const job = this.jobs.get(id)!;
    const onProgress = (loaded: number) => this.update(id, { loaded }, false);
    try {
      const resume = job.sessionUrl !== null;
      job.sessionUrl ??= await createUploadSession(job.file, job.mimeType, job.guest);
      try {
        await uploadToSession(job.sessionUrl, job.file, onProgress, resume);
      } catch (e) {
        if (!(e instanceof SessionExpiredError)) throw e;
        job.sessionUrl = await createUploadSession(job.file, job.mimeType, job.guest);
        await uploadToSession(job.sessionUrl, job.file, onProgress, false);
      }
      this.jobs.delete(id);
      this.update(id, { status: "done", loaded: job.file.size });
    } catch (e) {
      console.error(e);
      const error =
        e instanceof UploadError ? e.message : "Slanje nije uspelo. Pokušajte ponovo.";
      this.update(id, { status: "error", error });
    }
  }

  private update(id: number, patch: Partial<UploadItem>, immediate = true) {
    this.items = this.items.map((i) => (i.id === id ? { ...i, ...patch } : i));
    this.notify(immediate);
  }

  /** Progress events fire many times a second; batch them so the list doesn't re-render on each. */
  private notify(immediate: boolean) {
    if (immediate) {
      if (this.notifyTimer) clearTimeout(this.notifyTimer);
      this.notifyTimer = null;
      this.listeners.forEach((l) => l());
    } else if (!this.notifyTimer) {
      this.notifyTimer = setTimeout(() => this.notify(true), NOTIFY_INTERVAL_MS);
    }
  }

  // While uploading: warn before closing the tab and keep the screen on, since a
  // locked phone suspends the upload.
  private syncBusy() {
    const busy = this.running > 0;
    if (busy === this.busy) return;
    this.busy = busy;
    if (busy) {
      window.addEventListener("beforeunload", preventUnload);
      document.addEventListener("visibilitychange", this.requestWakeLock);
      void this.requestWakeLock();
    } else {
      window.removeEventListener("beforeunload", preventUnload);
      document.removeEventListener("visibilitychange", this.requestWakeLock);
      void this.wakeLock?.release();
      this.wakeLock = null;
    }
  }

  private requestWakeLock = async () => {
    if (document.visibilityState !== "visible" || !("wakeLock" in navigator)) return;
    try {
      this.wakeLock = await navigator.wakeLock.request("screen");
    } catch {
      // Not allowed (e.g. battery saver); uploads still work.
    }
  };
}

function preventUnload(e: BeforeUnloadEvent) {
  e.preventDefault();
}

export const uploadQueue = new UploadQueue();

export function queueSummary(items: readonly UploadItem[]) {
  const accepted = items.filter((i) => i.status !== "error");
  const totalBytes = accepted.reduce((sum, i) => sum + i.size, 0);
  const loadedBytes = accepted.reduce((sum, i) => sum + Math.min(i.loaded, i.size), 0);
  return {
    total: items.length,
    done: items.filter((i) => i.status === "done").length,
    failed: items.filter((i) => i.status === "error").length,
    active: items.filter((i) => i.status === "queued" || i.status === "uploading").length,
    percent: totalBytes ? Math.floor((loadedBytes / totalBytes) * 100) : 0,
  };
}

export const NO_UPLOADS: readonly UploadItem[] = [];
