"use client";

import Link from "next/link";
import { ImagesIcon, UploadIcon } from "./icons";
import { useEventConfig } from "./key-gate";
import { primaryButton, secondaryButton } from "./ui";

export function HomeActions() {
  const { uploadsOpen } = useEventConfig();

  return (
    <nav className="mt-10 flex w-full flex-col gap-4">
      {uploadsOpen ? (
        <Link href="/posalji" className={primaryButton}>
          <UploadIcon />
          Pošalji slike i snimke
        </Link>
      ) : (
        <p className="text-sm text-muted">Slanje novih slika je zatvoreno. Hvala svima!</p>
      )}
      <Link href="/galerija" className={secondaryButton}>
        <ImagesIcon />
        Pogledaj galeriju
      </Link>
    </nav>
  );
}
