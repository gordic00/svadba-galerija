import { HomeActions } from "@/components/home-actions";
import { PrivacyLink } from "@/components/privacy-link";
import { COUPLE_NAMES, WEDDING_DATE } from "@/lib/site";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-xs uppercase tracking-[0.35em] text-muted">Venčanje</p>
      <h1 className="mt-4 font-serif text-5xl font-medium leading-tight text-balance">
        {COUPLE_NAMES}
      </h1>
      {WEDDING_DATE && <p className="mt-2 font-serif text-xl text-muted">{WEDDING_DATE}</p>}
      <div className="my-8 h-px w-16 bg-gold/50" />
      <p className="text-balance text-muted">
        Hvala što ste deo našeg dana! Podelite sa nama slike i snimke koje ste zabeležili.
      </p>
      <HomeActions />
      <PrivacyLink className="mt-12" />
    </main>
  );
}
