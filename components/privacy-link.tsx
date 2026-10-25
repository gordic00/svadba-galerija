import Link from "next/link";

export function PrivacyLink({ className = "" }: { className?: string }) {
  return (
    <Link href="/privatnost" className={`text-xs text-muted underline ${className}`}>
      Politika privatnosti
    </Link>
  );
}
