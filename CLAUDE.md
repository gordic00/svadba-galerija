# Svadbena galerija

Wedding photo service: guests scan a printed QR code, upload photos/videos from the phone browser straight to one Google Drive folder, and browse a shared gallery. Talk to the user (Dragan) in Serbian. Guest-facing UI copy is Serbian Latin; code and comments are English.

The runbook (Google Cloud setup, Vercel deploy, QR printing, troubleshooting) is [UPUTSTVO.md](UPUTSTVO.md). When setup or deploy steps change, update it too.

@AGENTS.md

## Commands

```bash
npm run dev | build | lint          # no unit test suite; lint + build must pass
npm run key [-- --force]            # EVENT_KEY → .env.local
npm run google:token                # OAuth loopback login → GOOGLE_REFRESH_TOKEN
npm run drive:setup [-- "Naziv"]    # create/check Drive folder, share as anyone-with-link reader, print quota
npm run qr -- https://<domain>      # qr/qr.png + qr/qr.svg (contain the key; gitignored)
```

Scripts are plain Node `.mjs` (`scripts/lib/env.mjs` reads/writes `.env.local`). They can't import the TS `lib/`, so `scripts/lib/google.mjs` duplicates the token refresh on purpose.

## Architecture and invariants

- **Files never pass through Vercel.** `POST /api/upload-session` opens a Drive resumable session, passing the page's `Origin` header, which makes Google answer the browser's PUTs with CORS headers. It returns `sessionUrl`, and `lib/uploader.ts` PUTs 8 MiB chunks straight to Google. Chunk size must stay a multiple of 256 KiB. Resume flow: a 308 response plus the `Range` header gives the next offset; after a network error, query with `Content-Range: bytes */size`; a 404/410 means the session expired, so start a new one.
- **Access** = `EVENT_KEY` in the QR link (`/?k=...`). `lib/client-api.ts` stores it in localStorage, strips it from the URL and sends it as the `x-event-key` header. **Every API route must call `rejectInvalidKey()` first.**
- **`KeyGate` in `app/(gost)/layout.tsx`** renders pages only after `/api/config` accepts the key. Pages therefore never SSR their content, and client components can safely read localStorage in `useState` initializers. Every page that needs the key goes into the `(gost)` route group. `/privatnost` is the only public page and sits outside the group, because Google's OAuth Branding page needs a home page URL and a privacy policy URL before the app can be published In production.
- **Drive scope is `drive.file`**: the app sees only files and folders it created itself. The folder must come from `npm run drive:setup`, never be made by hand, and manually added files won't show in the gallery. The folder is shared "anyone with the link: reader", so the gallery loads thumbnails, the video preview iframe and downloads from public Drive URLs (`lib/media.ts`), with no auth and no Vercel bandwidth.
- **Guests must never be able to delete.** This is a product requirement: don't add a delete endpoint or delete UI.
- No `googleapis` SDK; plain `fetch` to the REST endpoints in `lib/google.ts`. Keep dependencies minimal: the only runtime dep beyond Next/React is `yet-another-react-lightbox`, and `qrcode` is a dev dep for the script.
- `uploadQueue` (`lib/upload-queue.ts`) is a module singleton read via `useSyncExternalStore`, so uploads survive client-side navigation. It owns the `beforeunload` warning and the screen Wake Lock while busy. `UploadStatusPill` shows progress on other pages.
- Drive `appProperties` key+value is limited to 124 bytes, so the guest name is truncated in `upload-session/route.ts`. Drive file names are `YYYY-MM-DD_HH-mm-ss_<guest>_<original>` in Europe/Belgrade time.
- `/api/files` keeps a 10 s in-memory cache, because every open gallery polls every 30 s.
- `NEXT_PUBLIC_*` (couple names, date) are inlined at build time, so changing them needs a redeploy. All env vars are listed in `.env.example`.

## Conventions

- Next.js 16 with `cacheComponents` + `partialPrefetching`. Read `node_modules/next/dist/docs/` before using Next APIs.
- ESLint enforces `react-hooks/set-state-in-effect`: never set state synchronously in an effect body. See the `fetchInto`/`load` split in `components/gallery.tsx`.
- `@next/next/no-img-element` is off on purpose: images are Drive CDN or `blob:` URLs, and `next/image` would proxy them through Vercel.
- Tailwind v4 tokens live in `app/globals.css` (`ivory`, `ink`, `muted`, `line`, `gold`, `gold-dark`, `font-serif`). Shared button classes are in `components/ui.ts`; icons are inline SVG in `components/icons.tsx` (no icon library). The light theme is deliberate.
- Use `plural()` from `lib/format.ts` for Serbian counts (1 fajl / 2 fajla / 5 fajlova).
- Guest-facing error text comes from the API's `{ error }` body (Serbian) and is shown as-is.

## Verifying changes

No real Google credentials exist in a fresh checkout. What was used during development, and is worth recreating for upload or gallery changes:
- `curl` the API routes with fake `GOOGLE_*` env vars to test validation and key handling (Google calls then return 502).
- Run a headless browser e2e with `puppeteer-core` and `/usr/bin/google-chrome` against `next start`:
  - Intercept `/api/upload-session` so it returns a session URL on a local mock server. The mock implements CORS preflight, 308 + `Range`, a 200 on completion, and injected socket drops (inject ≥2, because Chrome silently retries an idempotent PUT once).
  - Intercept `/api/files` and `drive.google.com/*` with fake data.
  - Compare sha256 of the received bytes with the original file.
- Don't use `pkill -f "next start ..."` from Bash: it matches and kills the shell itself. Find the PID with `ss -ltnp | grep :PORT`.

## Known risks (not yet verified against real Google as of 2026-10-24)

These checks are UPUTSTVO.md step A8:
1. CORS on the resumable session URL when it is opened server-side with an `Origin` header. Fallback if it fails: a route that proxies 4 MiB chunks (multiple of 256 KiB) to `sessionUrl`; it costs Vercel bandwidth.
2. `drive.google.com/thumbnail?id=` for public files. Alternative: `https://lh3.googleusercontent.com/d/${id}=w${width}`.
3. The Drive `/file/d/<id>/preview` iframe for videos.
