import { rejectInvalidKey } from "@/lib/auth";
import type { EventConfig } from "@/lib/media";
import { maxFileMb, uploadsOpen } from "@/lib/server-config";

export async function GET(request: Request) {
  const denied = rejectInvalidKey(request);
  if (denied) return denied;

  const config: EventConfig = { uploadsOpen: uploadsOpen(), maxFileMb: maxFileMb() };
  return Response.json(config);
}
