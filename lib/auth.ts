import { timingSafeEqual } from "node:crypto";
import { requireEnv } from "./server-config";

export const KEY_HEADER = "x-event-key";

/** Returns a 401 response when the request doesn't carry the event key from the QR code. */
export function rejectInvalidKey(request: Request): Response | null {
  const given = Buffer.from(request.headers.get(KEY_HEADER) ?? "");
  const expected = Buffer.from(requireEnv("EVENT_KEY"));
  if (given.length === expected.length && timingSafeEqual(given, expected)) return null;
  return Response.json({ error: "Nevažeći ključ" }, { status: 401 });
}
