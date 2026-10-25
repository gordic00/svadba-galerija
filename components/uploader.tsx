"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type ChangeEvent } from "react";
import { loadGuestName, saveGuestName } from "@/lib/client-api";
import { formatBytes, plural } from "@/lib/format";
import { NO_UPLOADS, queueSummary, uploadQueue, type UploadItem } from "@/lib/upload-queue";
import { AlertIcon, CheckIcon, ImagesIcon, RetryIcon, UploadIcon, VideoIcon } from "./icons";
import { useEventConfig } from "./key-gate";
import { primaryButton, secondaryButton, textButton } from "./ui";

export function Uploader() {
  const config = useEventConfig();
  const items = useSyncExternalStore(uploadQueue.subscribe, uploadQueue.getSnapshot, () => NO_UPLOADS);
  const [guest, setGuest] = useState(loadGuestName);
  const summary = queueSummary(items);

  if (!config.uploadsOpen) {
    return (
      <div className="space-y-6 text-center">
        <p className="text-muted">Slanje novih slika je zatvoreno. Hvala svima na uspomenama!</p>
        <Link href="/galerija" className={secondaryButton}>
          <ImagesIcon />
          Pogledaj galeriju
        </Link>
      </div>
    );
  }

  function onFiles(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // lets the guest pick the same files again
    if (files.length === 0) return;
    uploadQueue.add(files, { guest: guest.trim(), maxFileBytes: config.maxFileMb * 1024 * 1024 });
  }

  const allDone = summary.total > 0 && summary.active === 0 && summary.failed === 0;

  return (
    <div className="space-y-6">
      <label className="block">
        <span className="text-sm text-muted">Vaše ime (nije obavezno)</span>
        <input
          value={guest}
          onChange={(e) => {
            setGuest(e.target.value);
            saveGuestName(e.target.value);
          }}
          maxLength={40}
          autoComplete="name"
          placeholder="npr. Marko i Jelena"
          className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 text-base outline-none focus:border-gold"
        />
      </label>

      <label className={`${primaryButton} cursor-pointer has-focus-visible:ring-2 has-focus-visible:ring-gold/50`}>
        <UploadIcon />
        Izaberi slike i snimke
        <input type="file" multiple accept="image/*,video/*" onChange={onFiles} className="sr-only" />
      </label>
      <p className="text-center text-sm text-balance text-muted">
        Možete izabrati više fajlova odjednom. Ne zatvarajte stranicu dok se slanje ne završi.
      </p>

      {summary.total > 0 && (
        <section className="space-y-3">
          {allDone ? (
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
              <CheckIcon className="mx-auto size-8 text-gold" />
              <p className="mt-2 font-serif text-2xl">Hvala vam!</p>
              <p className="text-sm text-muted">
                Poslato: {summary.done} {plural(summary.done, "fajl", "fajla", "fajlova")}.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Link href="/galerija" className={textButton}>
                  <ImagesIcon className="size-4" />
                  Pogledaj galeriju
                </Link>
                <button type="button" className={textButton} onClick={() => uploadQueue.clearFinished()}>
                  Očisti listu
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-baseline justify-between text-sm">
              <span>
                Poslato {summary.done} od {summary.total}
              </span>
              {summary.active > 0 && <span className="text-muted">{summary.percent}%</span>}
            </div>
          )}

          <ul className="space-y-2">
            {[...items].reverse().map((item) => (
              <UploadRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function UploadRow({ item }: { item: UploadItem }) {
  // Chrome can't decode HEIC, so iPhone photos picked on Android/desktop fall back to the icon.
  const [previewFailed, setPreviewFailed] = useState(false);
  const percent = item.size ? Math.floor((Math.min(item.loaded, item.size) / item.size) * 100) : 0;

  return (
    <li className="flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm">
      <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-line text-muted">
        {item.previewUrl && !previewFailed ? (
          <img
            src={item.previewUrl}
            alt=""
            decoding="async"
            onError={() => setPreviewFailed(true)}
            className="size-full object-cover"
          />
        ) : item.kind === "video" ? (
          <VideoIcon className="size-5" />
        ) : (
          <ImagesIcon className="size-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{item.name}</p>
        {item.status === "error" ? (
          <p className="text-xs text-red-700">{item.error}</p>
        ) : (
          <>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className={`h-full rounded-full transition-[width] ${item.status === "done" ? "bg-emerald-600" : "bg-gold"}`}
                style={{ width: `${item.status === "done" ? 100 : percent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              {formatBytes(item.size)} ·{" "}
              {item.status === "queued" ? "čeka" : item.status === "uploading" ? `${percent}%` : "poslato"}
            </p>
          </>
        )}
      </div>

      <div className="shrink-0 pr-1">
        {item.status === "done" && <CheckIcon className="size-5 text-emerald-600" />}
        {item.status === "error" &&
          (item.retryable ? (
            <button
              type="button"
              aria-label="Pokušaj ponovo"
              onClick={() => uploadQueue.retry(item.id)}
              className="rounded-full p-2 text-gold hover:bg-line/60"
            >
              <RetryIcon className="size-5" />
            </button>
          ) : (
            <AlertIcon className="size-5 text-red-700" />
          ))}
      </div>
    </li>
  );
}
