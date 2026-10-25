export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export function uploadsOpen(): boolean {
  const deadline = process.env.UPLOAD_DEADLINE;
  return !deadline || Date.now() < Date.parse(deadline);
}

export function maxFileMb(): number {
  return Number(process.env.MAX_FILE_MB) || 2048;
}
