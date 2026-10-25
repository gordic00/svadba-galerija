const KEY_STORAGE = "svadba:key";
const GUEST_STORAGE = "svadba:guest";

let eventKey: string | null = null;

function storageGet(name: string): string | null {
  try {
    return localStorage.getItem(name);
  } catch {
    return null;
  }
}

function storageSet(name: string, value: string) {
  try {
    localStorage.setItem(name, value);
  } catch {
    // Storage can be blocked; the value then lives only for this page load.
  }
}

/**
 * Takes the key from the QR link (?k=...) or from an earlier visit. The key is
 * removed from the address bar so a guest doesn't share it by copying the URL.
 */
export function loadEventKey(): string | null {
  const url = new URL(window.location.href);
  const fromUrl = url.searchParams.get("k");
  if (fromUrl) {
    storageSet(KEY_STORAGE, fromUrl);
    url.searchParams.delete("k");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }
  eventKey = fromUrl ?? eventKey ?? storageGet(KEY_STORAGE);
  return eventKey;
}

export const loadGuestName = () => storageGet(GUEST_STORAGE) ?? "";
export const saveGuestName = (name: string) => storageSet(GUEST_STORAGE, name);

export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (eventKey) headers.set("x-event-key", eventKey);
  return fetch(path, { ...init, headers });
}

/** The error text our API sends back, or a generic one. */
export async function apiErrorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `Greška ${res.status}`;
}
