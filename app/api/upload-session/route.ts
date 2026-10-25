import type { NextRequest } from "next/server";
import { rejectInvalidKey } from "@/lib/auth";
import { driveFailureResponse, initResumableUpload } from "@/lib/google";
import { maxFileMb, uploadsOpen } from "@/lib/server-config";

const TIME_ZONE = "Europe/Belgrade";
// Drive limits an appProperties key + value to 124 bytes.
const MAX_GUEST_BYTES = 100;

function clean(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFC")
    .replace(/[\p{Cc}/\\]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanGuest(value: unknown): string | null {
  let guest = clean(value, 40);
  while (Buffer.byteLength(guest) > MAX_GUEST_BYTES) guest = guest.slice(0, -1);
  return guest || null;
}

/** e.g. "2026-11-15_21-34-08_Marko_IMG_1234.jpg", so the Drive folder sorts by time. */
function driveFileName(original: string, guest: string | null): string {
  const stamp = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
    dateStyle: "short",
    timeStyle: "medium",
  })
    .format(new Date())
    .replace(" ", "_")
    .replaceAll(":", "-");
  return [stamp, guest, original || "fajl"].filter(Boolean).join("_");
}

export async function POST(request: NextRequest) {
  const denied = rejectInvalidKey(request);
  if (denied) return denied;

  if (!uploadsOpen()) {
    return Response.json({ error: "Slanje novih slika je zatvoreno." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "";
  const size = typeof body?.size === "number" ? body.size : 0;

  if (!/^(image|video)\/[\w.+-]+$/.test(mimeType)) {
    return Response.json({ error: "Može se slati samo slika ili video." }, { status: 415 });
  }
  if (!Number.isInteger(size) || size <= 0) {
    return Response.json({ error: "Fajl je prazan." }, { status: 400 });
  }
  if (size > maxFileMb() * 1024 * 1024) {
    return Response.json({ error: `Fajl je veći od ${maxFileMb()} MB.` }, { status: 413 });
  }

  const guest = cleanGuest(body?.guest);
  try {
    const sessionUrl = await initResumableUpload({
      name: driveFileName(clean(body?.fileName, 120), guest),
      mimeType,
      size,
      guest,
      origin: request.headers.get("origin") ?? request.nextUrl.origin,
    });
    return Response.json({ sessionUrl });
  } catch (e) {
    return driveFailureResponse(e);
  }
}
