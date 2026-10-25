import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { COUPLE_NAMES } from "@/lib/site";

// Public on purpose (outside the (gost) KeyGate): Google's OAuth Branding page
// needs a reachable privacy policy URL before the app can be published.
export const metadata: Metadata = { title: "Politika privatnosti" };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-serif text-2xl font-medium">{title}</h2>
      <div className="mt-2 space-y-3 text-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="Politika privatnosti" />
      <main className="mx-auto max-w-xl px-6 pt-2 pb-16 leading-relaxed">
        <Section title="Čija je ovo stranica">
          <p>
            Ovu stranicu su napravili {COUPLE_NAMES} za svoje venčanje, da bi gosti mogli da im
            pošalju slike i snimke. Mladenci odlučuju šta će biti sa poslatim fajlovima.
          </p>
        </Section>

        <Section title="Šta se prikuplja">
          <p>
            Slike i snimci koje pošaljete, zajedno sa podacima koje telefon upisuje u sam fajl
            (npr. vreme i mesto snimanja), vreme slanja i ime ako ga upišete. Ime nije obavezno.
          </p>
        </Section>

        <Section title="Gde se čuva">
          <p>
            Fajlovi idu direktno sa vašeg telefona u jedan folder na Google Drive-u mladenaca i ne
            prolaze kroz naš server. Galeriju vidi svako ko ima QR kod sa pozivnice.
          </p>
          <p>
            Stranicu hostuje Vercel, koji vodi uobičajene tehničke logove (npr. IP adresu i vreme
            zahteva).
          </p>
        </Section>

        <Section title="Na vašem telefonu">
          <p>
            Ključ iz QR koda i vaše ime čuvaju se u browseru (localStorage), da ne morate ponovo da
            ih unosite. Nema kolačića za praćenje, analitike ni reklama.
          </p>
        </Section>

        <Section title="Google podaci">
          <p>
            Aplikacija koristi samo Google nalog mladenaca, sa dozvolom <code>drive.file</code>:
            pravi jedan folder, u njega šalje fajlove gostiju i čita spisak tih fajlova za
            galeriju. Ostale fajlove na tom Drive-u ne vidi i nikome ne prosleđuje podatke.
          </p>
          <p>
            Korišćenje podataka dobijenih od Google API-ja je u skladu sa{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              className="text-gold underline"
            >
              Google API Services User Data Policy
            </a>
            , uključujući zahteve za Limited Use.
          </p>
        </Section>

        <Section title="Uklanjanje">
          <p>
            Gosti ne mogu sami da brišu fajlove. Ako želite da se neka slika ili snimak ukloni,
            javite se mladencima. Posle svadbe mladenci preuzimaju sve fajlove i zatvaraju
            galeriju.
          </p>
        </Section>
      </main>
    </>
  );
}
