import { KeyGate } from "@/components/key-gate";
import { UploadStatusPill } from "@/components/upload-status-pill";

// Every page in (gost) needs the key from the QR link. /privatnost stays outside, public.
export default function GuestLayout({ children }: LayoutProps<"/">) {
  return (
    <KeyGate>
      {children}
      <UploadStatusPill />
    </KeyGate>
  );
}
