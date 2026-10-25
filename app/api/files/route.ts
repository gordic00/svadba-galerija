import type { NextRequest } from "next/server";
import { rejectInvalidKey } from "@/lib/auth";
import { driveFailureResponse, listFolder } from "@/lib/google";
import type { MediaKind, MediaPage } from "@/lib/media";

// Every open gallery polls, so a warm instance answers repeated requests from memory.
const CACHE_TTL_MS = 10_000;
const cache = new Map<string, { at: number; page: MediaPage }>();

export async function GET(request: NextRequest) {
  const denied = rejectInvalidKey(request);
  if (denied) return denied;

  const params = request.nextUrl.searchParams;
  const pageToken = params.get("pageToken") ?? undefined;
  const kindParam = params.get("kind");
  const kind: MediaKind | undefined =
    kindParam === "image" || kindParam === "video" ? kindParam : undefined;

  const cacheKey = `${kind ?? "all"}:${pageToken ?? ""}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return Response.json(hit.page);

  try {
    const page = await listFolder({ pageToken, kind });
    if (cache.size > 200) cache.clear();
    cache.set(cacheKey, { at: Date.now(), page });
    return Response.json(page);
  } catch (e) {
    return driveFailureResponse(e);
  }
}
