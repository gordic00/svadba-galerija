"use client";

import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { apiFetch, loadEventKey } from "@/lib/client-api";
import type { EventConfig } from "@/lib/media";
import { COUPLE_NAMES } from "@/lib/site";
import { CameraIcon } from "./icons";
import { PrivacyLink } from "./privacy-link";
import { primaryButton } from "./ui";

type GateState =
  | { status: "checking" }
  | { status: "missing" | "invalid" | "offline" }
  | { status: "ok"; config: EventConfig };

const EventConfigContext = createContext<EventConfig | null>(null);

export function useEventConfig(): EventConfig {
  const config = use(EventConfigContext);
  if (!config) throw new Error("useEventConfig must be used inside <KeyGate>");
  return config;
}

async function checkKey(): Promise<GateState> {
  if (!loadEventKey()) return { status: "missing" };
  try {
    const res = await apiFetch("/api/config");
    if (res.status === 401) return { status: "invalid" };
    if (!res.ok) return { status: "offline" };
    return { status: "ok", config: (await res.json()) as EventConfig };
  } catch {
    return { status: "offline" };
  }
}

/** Shows the app only to guests who came through the QR code. */
export function KeyGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ status: "checking" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    void checkKey().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  if (state.status === "ok") {
    return <EventConfigContext value={state.config}>{children}</EventConfigContext>;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-4xl font-medium">{COUPLE_NAMES}</h1>
      {state.status === "checking" && (
        <div className="mt-8 size-6 animate-spin rounded-full border-2 border-line border-t-gold" />
      )}
      {(state.status === "missing" || state.status === "invalid") && (
        <>
          <CameraIcon className="mt-8 size-10 text-gold" />
          <p className="mt-4 text-balance text-muted">
            {state.status === "missing"
              ? "Da biste delili i gledali slike, skenirajte QR kod sa pozivnice."
              : "Ovaj link nije ispravan. Skenirajte ponovo QR kod sa pozivnice."}
          </p>
          <PrivacyLink className="mt-12" />
        </>
      )}
      {state.status === "offline" && (
        <>
          <p className="mt-6 text-balance text-muted">
            Nema veze sa serverom. Proverite internet i pokušajte ponovo.
          </p>
          <button
            type="button"
            className={`${primaryButton} mt-6`}
            onClick={() => {
              setState({ status: "checking" });
              setAttempt((a) => a + 1);
            }}
          >
            Pokušaj ponovo
          </button>
        </>
      )}
    </main>
  );
}
