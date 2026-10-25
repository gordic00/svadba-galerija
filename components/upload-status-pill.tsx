"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { NO_UPLOADS, queueSummary, uploadQueue } from "@/lib/upload-queue";

/** Uploads keep running when the guest leaves the upload page; this shows they still are. */
export function UploadStatusPill() {
  const pathname = usePathname();
  const items = useSyncExternalStore(uploadQueue.subscribe, uploadQueue.getSnapshot, () => NO_UPLOADS);
  const summary = queueSummary(items);
  if (pathname === "/posalji" || summary.active === 0) return null;

  return (
    <Link
      href="/posalji"
      className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm text-white shadow-lg"
    >
      Slanje u toku… {summary.percent}%
    </Link>
  );
}
