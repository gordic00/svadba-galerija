"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Lightbox, { type GenericSlide, type RenderSlideProps, type Slide } from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Download from "yet-another-react-lightbox/plugins/download";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import { apiErrorMessage, apiFetch } from "@/lib/client-api";
import { formatDuration } from "@/lib/format";
import {
  downloadUrl,
  thumbnailUrl,
  videoPreviewUrl,
  type MediaItem,
  type MediaKind,
  type MediaPage,
} from "@/lib/media";
import { ArrowUpIcon, PlayIcon, UploadIcon } from "./icons";
import { useEventConfig } from "./key-gate";
import { primaryButton, textButton } from "./ui";

declare module "yet-another-react-lightbox" {
  interface DriveVideoSlide extends GenericSlide {
    type: "drive-video";
    fileId: string;
  }
  interface SlideTypes {
    "drive-video": DriveVideoSlide;
  }
}

const POLL_INTERVAL_MS = 30_000;

const FILTERS: { kind: MediaKind | null; label: string }[] = [
  { kind: null, label: "Sve" },
  { kind: "image", label: "Slike" },
  { kind: "video", label: "Video" },
];

async function fetchPage(kind: MediaKind | null, pageToken: string | null): Promise<MediaPage> {
  const params = new URLSearchParams();
  if (kind) params.set("kind", kind);
  if (pageToken) params.set("pageToken", pageToken);
  const res = await apiFetch(`/api/files?${params}`);
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return (await res.json()) as MediaPage;
}

function mergeUnique(first: MediaItem[], second: MediaItem[]): MediaItem[] {
  const seen = new Set(first.map((i) => i.id));
  return [...first, ...second.filter((i) => !seen.has(i.id))];
}

function toSlide(item: MediaItem): Slide {
  const shared = {
    description: item.guest ? `od: ${item.guest}` : undefined,
    download: downloadUrl(item.id),
  };
  return item.kind === "video"
    ? { type: "drive-video", fileId: item.id, ...shared }
    : { src: thumbnailUrl(item.id, 2048), ...shared };
}

function renderSlide({ slide, offset }: RenderSlideProps) {
  if (slide.type !== "drive-video") return undefined;
  // Only the visible video gets a player, so swiping away stops playback.
  if (offset !== 0) return null;
  return (
    <iframe
      src={videoPreviewUrl(slide.fileId)}
      title="Video"
      allow="autoplay; fullscreen"
      allowFullScreen
      className="h-[78%] w-full max-w-4xl rounded-lg bg-black"
    />
  );
}

export function Gallery() {
  const [kind, setKind] = useState<MediaKind | null>(null);

  return (
    <>
      <div role="tablist" className="flex justify-center gap-1 px-4 py-3">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            role="tab"
            aria-selected={kind === f.kind}
            onClick={() => setKind(f.kind)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              kind === f.kind ? "bg-ink text-white" : "text-muted hover:bg-line/60"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {/* Remount per filter so each one starts from a clean list. */}
      <MediaFeed key={kind ?? "all"} kind={kind} />
    </>
  );
}

function MediaFeed({ kind }: { kind: MediaKind | null }) {
  const { uploadsOpen } = useEventConfig();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [fresh, setFresh] = useState<MediaItem[]>([]);
  const [openIndex, setOpenIndex] = useState(-1);
  const knownIds = useRef(new Set<string>());
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchInto = useCallback(
    (pageToken: string | null) =>
      fetchPage(kind, pageToken)
        .then((page) => {
          setItems((prev) => (pageToken ? mergeUnique(prev, page.items) : page.items));
          setNextToken(page.nextPageToken);
          setStatus("idle");
        })
        .catch((e: unknown) => {
          console.error(e);
          setStatus("error");
        }),
    [kind],
  );

  const load = useCallback(
    (pageToken: string | null) => {
      setStatus("loading");
      void fetchInto(pageToken);
    },
    [fetchInto],
  );

  useEffect(() => {
    void fetchInto(null);
  }, [fetchInto]);

  useEffect(() => {
    knownIds.current = new Set(items.map((i) => i.id));
  }, [items]);

  // Infinite scroll: load the next page when the end of the grid comes near.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextToken || status !== "idle") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) load(nextToken);
      },
      { rootMargin: "1000px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextToken, status, load]);

  // New uploads from other guests are offered with a button instead of being
  // inserted, so the grid doesn't jump while someone is scrolling.
  useEffect(() => {
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const page = await fetchPage(kind, null);
        setFresh(page.items.filter((i) => !knownIds.current.has(i.id)));
      } catch {
        // Next poll will try again.
      }
    };
    const timer = setInterval(check, POLL_INTERVAL_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [kind]);

  const slides = useMemo(() => items.map(toSlide), [items]);

  function showFresh() {
    setItems((prev) => mergeUnique(fresh, prev));
    setFresh([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (status === "idle" && items.length === 0 && fresh.length === 0) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="font-serif text-2xl">Još nema slika</p>
        <p className="mt-2 text-muted">Budite prvi koji će podeliti trenutak sa venčanja!</p>
        {uploadsOpen && (
          <Link href="/posalji" className={`${primaryButton} mx-auto mt-8 max-w-xs`}>
            <UploadIcon />
            Pošalji slike
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      {fresh.length > 0 && (
        <button
          type="button"
          onClick={showFresh}
          className="fixed top-16 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gold px-4 py-2 text-sm font-medium text-white shadow-lg"
        >
          <ArrowUpIcon className="size-4" />
          {fresh.length === 1 ? "1 nova" : `Nove: ${fresh.length}`}
        </button>
      )}

      <ul className="grid grid-cols-3 gap-0.5 sm:grid-cols-4 sm:gap-1 lg:grid-cols-6">
        {items.map((item, index) => (
          <li key={item.id}>
            <Tile item={item} onOpen={() => setOpenIndex(index)} />
          </li>
        ))}
      </ul>

      <div ref={sentinelRef} className="flex justify-center py-8">
        {status === "loading" && (
          <div className="size-6 animate-spin rounded-full border-2 border-line border-t-gold" />
        )}
        {status === "error" && (
          <div className="text-center">
            <p className="text-sm text-muted">Galerija trenutno ne može da se učita.</p>
            <button
              type="button"
              className={`${textButton} mt-2`}
              onClick={() => load(items.length ? nextToken : null)}
            >
              Pokušaj ponovo
            </button>
          </div>
        )}
      </div>

      <Lightbox
        open={openIndex >= 0}
        index={openIndex}
        close={() => setOpenIndex(-1)}
        slides={slides}
        plugins={[Captions, Zoom, Download]}
        render={{ slide: renderSlide }}
        carousel={{ finite: true }}
        on={{
          view: ({ index }) => {
            setOpenIndex(index);
            if (index >= items.length - 3 && nextToken && status === "idle") load(nextToken);
          },
        }}
        download={{
          download: ({ slide }) => {
            if (typeof slide.download === "string") window.open(slide.download, "_blank", "noopener");
          },
        }}
        captions={{ descriptionTextAlign: "center" }}
        labels={{ Previous: "Prethodna", Next: "Sledeća", Close: "Zatvori", Download: "Preuzmi" }}
      />
    </>
  );
}

function Tile({ item, onOpen }: { item: MediaItem; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={item.kind === "video" ? "Pusti video" : "Otvori sliku"}
      className="group relative block aspect-square w-full overflow-hidden bg-line"
    >
      <Thumbnail id={item.id} />
      {item.kind === "video" && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-10 place-items-center rounded-full bg-black/45 text-white">
            <PlayIcon className="size-5 translate-x-px" />
          </span>
        </span>
      )}
      {item.durationMs !== undefined && (
        <span className="absolute top-1 right-1 rounded bg-black/55 px-1 text-[10px] text-white">
          {formatDuration(item.durationMs)}
        </span>
      )}
      {item.guest && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/60 to-transparent px-1.5 pt-4 pb-1 text-left text-[11px] text-white">
          {item.guest}
        </span>
      )}
    </button>
  );
}

const THUMB_RETRY_MS = 20_000;
const THUMB_MAX_RETRIES = 20;

/** Drive needs a moment (minutes for long videos) to make a thumbnail for a fresh upload; keep retrying until it exists. */
function Thumbnail({ id }: { id: string }) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!failed || attempt >= THUMB_MAX_RETRIES) return;
    const timer = setTimeout(() => {
      setFailed(false);
      setAttempt((a) => a + 1);
    }, THUMB_RETRY_MS);
    return () => clearTimeout(timer);
  }, [failed, attempt]);

  if (failed) {
    return (
      <span className="grid size-full place-items-center px-1 text-[11px] text-muted">
        Obrađuje se…
      </span>
    );
  }
  return (
    <img
      src={attempt ? `${thumbnailUrl(id, 400)}&retry=${attempt}` : thumbnailUrl(id, 400)}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="size-full object-cover transition duration-300 group-hover:scale-105"
    />
  );
}
