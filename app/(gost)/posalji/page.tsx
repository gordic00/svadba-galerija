import { PageHeader } from "@/components/page-header";
import { Uploader } from "@/components/uploader";

export default function UploadPage() {
  return (
    <>
      <PageHeader title="Pošalji slike i snimke" />
      <main className="mx-auto max-w-xl px-4 pt-6 pb-16">
        <Uploader />
      </main>
    </>
  );
}
