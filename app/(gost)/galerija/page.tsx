import { Gallery } from "@/components/gallery";
import { PageHeader } from "@/components/page-header";

export default function GalleryPage() {
  return (
    <>
      <PageHeader title="Galerija" />
      <main className="mx-auto max-w-5xl pb-16">
        <Gallery />
      </main>
    </>
  );
}
