import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeftIcon } from "./icons";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ivory/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2.5">
        <Link href="/" aria-label="Nazad na početnu" className="rounded-full p-2 hover:bg-line/60">
          <ArrowLeftIcon />
        </Link>
        <h1 className="font-serif text-2xl font-medium">{title}</h1>
        {action && <div className="ml-auto">{action}</div>}
      </div>
    </header>
  );
}
