// Creates the wedding folder (or checks the existing one), shares it as
// "anyone with the link: viewer" and reports free space. Safe to run again.
// Usage: npm run drive:setup [-- "Naziv foldera"]
import { loadEnv, setEnvVar } from "./lib/env.mjs";
import { drive, getAccessToken } from "./lib/google.mjs";

loadEnv();
const token = await getAccessToken();

let folderId = process.env.DRIVE_FOLDER_ID;
let folder;
if (folderId) {
  folder = await drive(token, `/files/${folderId}?fields=id,name,webViewLink,trashed`).catch(() => null);
  if (!folder || folder.trashed) {
    console.error(
      `✗ Folder ${folderId} ne postoji ili ga aplikacija ne vidi.\n` +
        "  Obriši DRIVE_FOLDER_ID iz .env.local i pokreni ponovo da se napravi novi.",
    );
    process.exit(1);
  }
  console.log(`✓ Postojeći folder: ${folder.name}`);
} else {
  const couple = process.env.NEXT_PUBLIC_COUPLE_NAMES;
  const name = process.argv[2] ?? (couple ? `Svadba – ${couple}` : "Svadba – slike gostiju");
  folder = await drive(token, "/files?fields=id,name,webViewLink", {
    method: "POST",
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder" }),
  });
  folderId = folder.id;
  setEnvVar("DRIVE_FOLDER_ID", folderId);
  console.log(`✓ Napravljen folder "${folder.name}", DRIVE_FOLDER_ID upisan u .env.local`);
}

try {
  await drive(token, `/files/${folderId}/permissions?fields=id`, {
    method: "POST",
    body: JSON.stringify({ type: "anyone", role: "reader", allowFileDiscovery: false }),
  });
  console.log('✓ Deljenje: "Anyone with the link" → Viewer (gosti mogu samo da gledaju)');
} catch (e) {
  console.error(`✗ Deljenje nije uspelo: ${e.message}`);
  console.error("  Ako je ovo Google Workspace nalog, admin možda blokira javne linkove.");
  process.exitCode = 1;
}

const about = await drive(token, "/about?fields=user(emailAddress),storageQuota");
const gb = (bytes) => (Number(bytes) / 1024 ** 3).toFixed(1);
const { limit, usage } = about.storageQuota;
console.log(`\nNalog: ${about.user.emailAddress}`);
console.log(
  limit
    ? `Prostor: zauzeto ${gb(usage)} GB od ${gb(limit)} GB (slobodno ${gb(limit - usage)} GB)`
    : `Prostor: zauzeto ${gb(usage)} GB (bez limita)`,
);
console.log(`Folder: ${folder.webViewLink}`);
