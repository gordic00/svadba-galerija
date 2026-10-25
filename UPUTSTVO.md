# Svadbena galerija: uputstvo za test i puštanje live

Gost skenira QR kod i u browseru (bez instalacije) dobija dve opcije:

- **Pošalji slike i snimke**: fajlovi idu direktno sa telefona u Google Drive folder.
- **Galerija**: pregled svega što je poslato. Brisanje ne postoji.

```
telefon gosta ──(1) "otvori upload"──▶ Vercel (/api/upload-session) ──▶ Google Drive API
      │                                   vraća sessionUrl
      └──(2) fajl u delovima od 8MB ──────────────────────────────────▶ Google Drive (direktno)

galerija ──▶ Vercel (/api/files) lista fajlova ──▶ sličice/video učitava direktno sa Google-a
```

Vercel nikad ne prenosi same fajlove, pa nema limita veličine ni troška bandwidth-a. Ako veza pukne, upload nastavlja od poslednjeg potvrđenog dela.

---

## Pregled (čeklista)

**A) Lokalni test**
- [ ] A1. Izabran Google nalog na koji idu slike
- [ ] A2. Google Cloud projekat + uključen Google Drive API
- [ ] A3. OAuth ekran za saglasnost podešen i **objavljen (In production)** (traži konačnu adresu, B1)
- [ ] A4. Napravljen OAuth client (Desktop app)
- [ ] A5. `.env.local` popunjen
- [ ] A6. `npm run key`, `npm run google:token`, `npm run drive:setup`
- [ ] A7. Lokalno pokrenuto i testirano u browseru na računaru
- [ ] A8. **Ključni test**: veliki video, provera CORS-a, sličica i video plejera
- [ ] A9. (opciono) test sa telefona u lokalnoj mreži

**B) Puštanje live**
- [ ] B1. Izabran konačan URL (domen)
- [ ] B2. Kod na GitHub-u (privatni repo)
- [ ] B3. Vercel projekat + env varijable + deploy
- [ ] B4. Test produkcije sa telefona (iOS i Android, mobilni internet)
- [ ] B5. Proveren prostor na Google Drive-u
- [ ] B6. QR kod generisan, probno odštampan i skeniran
- [ ] B7. Generalna proba sa nekoliko ljudi
- [ ] B8. Plan za dan svadbe i posle nje

---

## A) Lokalni test

### A1. Google nalog

Sve slike završavaju na Google Drive-u **jednog** naloga (npr. naloga mladenaca). Taj nalog se koristi u koraku A6. Google Cloud projekat (A2-A4) možeš da napraviš i sa drugim nalogom, ali je najjednostavnije da sve bude isti nalog.

> Besplatan nalog ima **15 GB**, i taj prostor dele Gmail, Drive i Photos. Pogledaj B5 pre svadbe.

### A2. Google Cloud projekat

1. Otvori https://console.cloud.google.com/ i prijavi se.
2. Gore levo izaberi projekat → **New Project** → ime npr. `svadba-galerija` → **Create**. Proveri da je novi projekat izabran.
3. Otvori https://console.cloud.google.com/apis/library/drive.googleapis.com → **Enable**.

### A3. OAuth ekran za saglasnost

Meni: **APIs & Services → OAuth consent screen**. U novijem interfejsu se zove **Google Auth Platform**.

1. **Get started** / **Branding**. Ovde ti treba konačna adresa sajta iz [B1](#b1-konačan-url-pre-štampe), pa je izaberi sada (npr. `ana-i-marko-svadba.vercel.app`). Popuni:
   - App name `Svadbena galerija`, User support email = tvoj email, Developer contact = tvoj email
   - **Application home page**: `https://<domen>/`
   - **Application privacy policy link**: `https://<domen>/privatnost` (stranica je deo aplikacije i radi bez ključa)
   - **Authorized domains** → **Add domain**: `<ime-projekta>.vercel.app`, ili tvoj domen bez poddomena (npr. `anaimarko.rs`)
   - **App logo** i **Terms of service** ostavi prazne. Ako postaviš logo, Google traži verifikaciju aplikacije, jer je ona In production (korak 4). Ekran za saglasnost vidiš samo ti, kod `npm run google:token`, a gosti ga nikad ne vide.

   → Save. Sajt na toj adresi proradi tek posle deploy-a (B3). Ako Google u koraku 4 odbije objavljivanje zato što link ne radi, prvo uradi B2-B3, pa se vrati na korak 4.
2. **Audience**: User type **External**.
3. **Data Access** → **Add or remove scopes** → u filter upiši `drive.file` → čekiraj `.../auth/drive.file` ("See, edit, create, and delete only the specific Google Drive files you use with this app") → Update → Save.
4. **Audience** → Publishing status → **Publish app** → potvrdi. Status mora da bude **In production**.

> ⚠️ **Ovo je najvažniji korak.** Dok je aplikacija u statusu *Testing*, Google poništava token posle **7 dana** i upload prestaje da radi (videćeš `invalid_grant`). Za `drive.file` scope Google verifikacija nije potrebna (dok god nema loga, vidi korak 1), pa je objavljivanje bez rizika.

### A4. OAuth client

**Google Auth Platform → Clients** (ili APIs & Services → Credentials) → **Create client**:

- Application type: **Desktop app**
- Name: `svadba-cli` → **Create**

Zapiši **Client ID** i **Client secret**. Možeš i da skineš JSON fajl, ali ne čuvaj ga u projektu.

### A5. `.env.local`

```bash
cd ~/Projects/pp/svadba-galerija
cp .env.example .env.local
```

U `.env.local` upiši:

```
GOOGLE_CLIENT_ID=....apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
NEXT_PUBLIC_COUPLE_NAMES=Ana & Marko
NEXT_PUBLIC_WEDDING_DATE=15. novembar 2026.
```

Ostala polja popunjavaju skripte u sledećem koraku. `.env.local` je u `.gitignore`, pa nikad ne ide na GitHub.

### A6. Ključ, Google token i Drive folder

```bash
npm install
npm run key            # upisuje EVENT_KEY (tajni deo QR linka)
npm run google:token   # otvara browser za Google prijavu
npm run drive:setup    # pravi folder na Drive-u i deli ga kao "Viewer"
```

Kod `npm run google:token`:
- Prijavi se **nalogom na koji idu slike** (A1).
- Ako se pojavi *"Google hasn't verified this app"*: **Advanced → Go to Svadbena galerija (unsafe)**. To je normalno za ličnu aplikaciju.
- Na kraju piše `✓ GOOGLE_REFRESH_TOKEN upisan u .env.local`.

`npm run drive:setup` treba da ispiše:

```
✓ Napravljen folder "Svadba – Ana & Marko", DRIVE_FOLDER_ID upisan u .env.local
✓ Deljenje: "Anyone with the link" → Viewer (gosti mogu samo da gledaju)
Nalog: ...@gmail.com
Prostor: zauzeto 3.2 GB od 15.0 GB (slobodno 11.8 GB)
Folder: https://drive.google.com/drive/folders/...
```

Skripta se može pokretati više puta: ako folder već postoji, samo ga proveri i ispiše prostor.

> Folder **ne pravi ručno** u Drive-u. Aplikacija sa `drive.file` dozvolom vidi samo foldere i fajlove koje je sama napravila.

### A7. Pokretanje na računaru

```bash
npm run dev
grep EVENT_KEY .env.local     # prikaži ključ
```

Otvori `http://localhost:3000/?k=<EVENT_KEY>`:

- [ ] Početna strana prikazuje imena i dva dugmeta, a `?k=...` nestaje iz adrese.
- [ ] `http://localhost:3000` u incognito prozoru (bez ključa) prikazuje "skenirajte QR kod".
- [ ] `http://localhost:3000/?k=pogresno` prikazuje "link nije ispravan".
- [ ] `http://localhost:3000/privatnost` se otvara i bez ključa.

### A8. Ključni test: upload i galerija

Ovo je prva provera sa pravim Google-om. Ako ovde sve prođe, produkcija radi isto.

1. Otvori DevTools (F12) → tab **Network** i **Console**.
2. **Pošalji slike i snimke** → upiši ime → izaberi 2-3 slike i **jedan video od 100MB+**.
3. U Network tabu proveri:
   - [ ] `upload-session` → 200
   - [ ] više `PUT` zahteva ka `www.googleapis.com/upload/drive/...`: međustatus **308**, poslednji **200**
   - [ ] u Console-u **nema CORS grešaka**
4. Otvori Drive folder (link iz `drive:setup`):
   - [ ] fajlovi su tu, imena oblika `2026-11-15_21-34-08_Marko_IMG_1234.jpg`
5. Test prekida: dok šalješ veliki video, u DevTools → Network izaberi **Offline**, sačekaj 10 s, pa vrati **No throttling**:
   - [ ] upload se sam nastavlja i završava, ne kreće od nule
6. **Galerija**:
   - [ ] vide se sličice (sveže poslat video može par minuta da pokazuje "Obrađuje se…")
   - [ ] klik na sliku otvara uvećanje, a ime gosta je ispod
   - [ ] klik na video ga pušta (Drive plejer; odmah posle slanja može da piše da se video još obrađuje)
   - [ ] dugme **Preuzmi** skida fajl
   - [ ] nigde ne postoji opcija za brisanje
7. Otvori link nekog fajla iz Drive foldera u **incognito** prozoru:
   - [ ] fajl se vidi, ali nema opcija za brisanje i izmenu

Ako nešto ne radi, pogledaj [Ako nešto ne radi](#ako-nešto-ne-radi).

### A9. (opciono) Test sa telefona u istoj Wi-Fi mreži

```bash
hostname -I                       # npr. 192.168.1.144
npm run dev -- -H 192.168.1.144
```

Na telefonu otvori `http://192.168.1.144:3000/?k=<EVENT_KEY>`. Preko `http://` neke stvari rade slabije (ekran se može ugasiti tokom slanja), pa je pravi test sa telefona B4 na HTTPS-u.

---

## B) Puštanje live

### B1. Konačan URL (pre štampe!)

Adresa je upisana u QR kod, pa se **posle štampe ne sme menjati**. Opcije:

- **Besplatno**: `https://<ime-projekta>.vercel.app`. Ime projekta biraš u B3, npr. `ana-i-marko-svadba`.
- **Sopstveni domen** (npr. `slike.anaimarko.rs`): kupi domen, pa ga u Vercel → Project → Settings → **Domains** dodaj i podesi DNS zapise koje Vercel prikaže.

Ista adresa je upisana i u Google Branding (A3). Ako na kraju bude drugačija (npr. ime projekta je zauzeto na Vercelu), ispravi tamo home page, privacy policy link i Authorized domains.

### B2. Kod na GitHub

Napravi **privatni** repo na GitHub-u (bez README-a), pa:

```bash
cd ~/Projects/pp/svadba-galerija
git add -A
git commit -m "Svadbena galerija"
git branch -M main
git remote add origin git@github.com:<tvoj-nalog>/svadba-galerija.git
git push -u origin main
```

Proveri da `.env.local` i `qr/` **nisu** u repou (`git ls-files | grep -E "env.local|qr/"` ne sme ništa da ispiše).

### B3. Vercel

1. https://vercel.com/new → **Import** repo `svadba-galerija`.
2. **Project Name**: ono što si izabrao u B1 (određuje `*.vercel.app` adresu). Mora da se poklapa sa adresom upisanom u A3.
3. Framework se sam prepoznaje (Next.js). Build podešavanja ne diraj.
4. **Environment Variables**: kopiraj ceo sadržaj `.env.local` i nalepi ga u prvo polje. Vercel sam razdvoji varijable. Moraju postojati:

   | Varijabla | Odakle |
   |---|---|
   | `GOOGLE_CLIENT_ID` | A4 |
   | `GOOGLE_CLIENT_SECRET` | A4 |
   | `GOOGLE_REFRESH_TOKEN` | `npm run google:token` |
   | `DRIVE_FOLDER_ID` | `npm run drive:setup` |
   | `EVENT_KEY` | `npm run key` |
   | `NEXT_PUBLIC_COUPLE_NAMES` | ručno |
   | `NEXT_PUBLIC_WEDDING_DATE` | ručno (opciono) |
   | `MAX_FILE_MB` | opciono, podrazumevano 2048 |
   | `UPLOAD_DEADLINE` | opciono, vidi B8 |

5. **Deploy**.

> Promena bilo koje env varijable na Vercelu važi tek posle **novog deploy-a**: Deployments → ⋯ → **Redeploy**. Za `NEXT_PUBLIC_*` je to obavezno jer se upisuju u kod pri build-u.

Alternativa bez GitHub-a: `npx vercel` iz foldera projekta, pa env varijable dodaš u dashboard-u i pokreneš `npx vercel --prod`.

### B4. Test produkcije sa telefona

Na **iPhone-u (Safari)** i **Android-u (Chrome)**, preko **mobilnog interneta** (ne kućnog Wi-Fi-ja), otvori `https://<domen>/?k=<EVENT_KEY>`:

- [ ] Početna radi; "Pošalji" otvara izbor kamera/galerija.
- [ ] `https://<domen>/privatnost` se otvara i bez ključa (link koji je upisan u Google Branding).
- [ ] Poslato 5 slika + 1 video od 300MB+ (snimljen telefonom, 1-2 minuta).
- [ ] Tokom slanja uključi **Airplane mode** na 10 s, pa ga isključi: slanje se nastavlja.
- [ ] Tokom slanja pređi na Galeriju: dole se vidi "Slanje u toku… X%", a upload ne staje.
- [ ] Ekran se ne gasi dok traje slanje.
- [ ] Sve se pojavljuje u Drive folderu i u galeriji na drugom telefonu (dugme "Nove" ili osvežavanje).
- [ ] iPhone slike (HEIC) i video (.mov) imaju sličice u galeriji posle par minuta.

Logovi servera: Vercel → Project → **Logs**.

### B5. Prostor na Drive-u

Gruba procena po gostu koji aktivno snima: 30 slika × 4 MB + 3 videa × 150 MB ≈ **0,5 GB**. Za 100-150 gostiju to je lako **20-50 GB**. Besplatnih 15 GB verovatno neće biti dovoljno.

- Proveri: `npm run drive:setup` (ispisuje slobodan prostor).
- Ako treba: **Google One 100 GB ili 200 GB** na mesec-dva (https://one.google.com) na nalogu iz A1. Može se otkazati posle preuzimanja.
- Ako se prostor popuni, gost dobija poruku "Prostor na Google Drive-u je popunjen. Javite mladencima."

### B6. QR kod

```bash
npm run qr -- https://<tvoj-domen>
```

Napravi `qr/qr.png` (2000×2000, za štampu) i `qr/qr.svg` (vektorski, za dizajnera) i ispiše tačan link.

- [ ] Ispisani link otvoren na telefonu radi.
- [ ] QR je odštampan bar **3×3 cm** (veći je bolji na stolu), crno na belom, sa belom ivicom oko koda.
- [ ] Pored koda stoji kratak tekst, npr. *"Skenirajte i podelite sa nama slike i snimke 📷"*.
- [ ] Probni otisak skeniran **iPhone kamerom i Android kamerom** sa udaljenosti stola, i pri slabijem svetlu.

> QR sadrži tajni ključ. Ne objavljuj ga javno (npr. na društvenim mrežama). Ako ključ procuri pre štampe: `npm run key -- --force`, ažuriraj `EVENT_KEY` na Vercelu, redeploy i ponovo `npm run qr`. **Posle štampe ključ više ne menjaj.**

### B7. Generalna proba (par dana pre)

- [ ] 3-4 osobe istovremeno šalju slike i video sa različitih telefona.
- [ ] Ako je moguće, proveri signal i Wi-Fi **u sali**. Ako sala ima Wi-Fi, odštampaj i ime mreže i šifru pored QR koda.
- [ ] Pogledaj Vercel Logs: ne sme biti crvenih grešaka.

### B8. Dan svadbe i posle

**Na dan svadbe**
- Povremeno pogledaj Drive folder i slobodan prostor.
- Ako nešto pukne: Vercel → Logs, pa [Ako nešto ne radi](#ako-nešto-ne-radi).

**Posle svadbe**
1. Kad želiš da zatvoriš slanje (galerija i dalje radi): na Vercelu dodaj `UPLOAD_DEADLINE`, npr. `2026-11-30T23:59:00+01:00`, pa **Redeploy**.
2. Preuzmi sve: Drive → desni klik na folder → **Download** (pravi ZIP). Za mnogo GB je pouzdaniji **Google Takeout** (https://takeout.google.com → samo Drive → taj folder).
3. Kad galerija više nije potrebna: Drive → folder → Share → General access → **Restricted** (galerija tada prestaje da prikazuje sličice), pa u Vercel-u obriši projekat.

---

## Ako nešto ne radi

| Simptom | Uzrok i rešenje |
|---|---|
| Na telefonu piše "Ovaj link nije ispravan" | `EVENT_KEY` na Vercelu nije isti kao u QR kodu. Uporedi ga sa `.env.local`, ispravi na Vercelu i pokreni Redeploy. |
| "Google Drive trenutno ne odgovara", u Vercel Logs `invalid_grant` | Refresh token je istekao ili je opozvan. Najčešće je aplikacija ostala u **Testing** (A3, korak 4). Objavi je, pokreni `npm run google:token`, ažuriraj `GOOGLE_REFRESH_TOKEN` na Vercelu, pa Redeploy. Token se poništava i kada se promeni lozinka Google naloga. |
| U logu `invalid_client` | Pogrešan `GOOGLE_CLIENT_ID` ili `GOOGLE_CLIENT_SECRET`. |
| U logu `File not found` za folder | `DRIVE_FOLDER_ID` ne odgovara nalogu iz tokena, ili je folder obrisan. Pokreni `npm run drive:setup`. |
| CORS greška u Console-u kod `PUT` ka googleapis.com | Google nije prihvatio Origin. Proveri u Vercel Logs da `upload-session` vraća 200 i da otvaraš sajt na istoj adresi na kojoj je zahtev napravljen. Ako i dalje ne radi, rezervni plan je ruta koja prosleđuje delove od 4MB preko Vercela (radi, ali troši Vercel bandwidth); javi pa ćemo je dodati. |
| "Prostor na Google Drive-u je popunjen" | Kupi još prostora (B5). Gosti mogu odmah da pritisnu ↻ (pokušaj ponovo). |
| Sličice stalno pišu "Obrađuje se…" | Za sveže fajlove je normalno da traje nekoliko minuta. Ako traje duže, proveri da je folder podeljen kao "Anyone with the link" (`npm run drive:setup`). Workspace nalozi mogu imati zabranu javnih linkova. U krajnjem slučaju u `lib/media.ts` zameni `thumbnailUrl` sa `` `https://lh3.googleusercontent.com/d/${id}=w${width}` ``. |
| Video plejer piše da se video obrađuje | Drive obrađuje video posle upload-a; dugački snimci mogu i 10+ minuta. Normalno je. |
| Fajlovi ubačeni ručno u folder se ne vide u galeriji | Namerno: aplikacija vidi samo fajlove poslate kroz nju (`drive.file`). |
| Upload stoji dok je telefon zaključan | Telefon pauzira slanje u pozadini. Kad se gost vrati na stranicu, slanje se samo nastavlja. Na HTTPS-u stranica drži ekran upaljenim dok šalje. |
| "Fajl je veći od 2048 MB" | Povećaj `MAX_FILE_MB` na Vercelu i pokreni Redeploy. Drive prima do 5 TB, ali na mobilnoj mreži veliki fajlovi traju dugo. |

---

## Referenca

**npm skripte**

| Komanda | Šta radi |
|---|---|
| `npm run dev` | lokalni server na :3000 |
| `npm run build` / `npm start` | produkcioni build lokalno |
| `npm run lint` | ESLint |
| `npm run key [-- --force]` | generiše `EVENT_KEY` |
| `npm run google:token` | Google prijava, upisuje `GOOGLE_REFRESH_TOKEN` |
| `npm run drive:setup [-- "Naziv"]` | pravi ili proverava folder, deljenje i prostor |
| `npm run qr -- <URL>` | pravi `qr/qr.png` i `qr/qr.svg` |

**Važni fajlovi**

| Fajl | Uloga |
|---|---|
| `app/(gost)/layout.tsx` | traži ključ iz QR koda za sve stranice gostiju |
| `app/privatnost/page.tsx` | javna politika privatnosti (traži je Google Branding, A3) |
| `app/api/upload-session/route.ts` | validacija i otvaranje Drive upload sesije |
| `app/api/files/route.ts` | lista fajlova za galeriju (keš 10 s) |
| `lib/uploader.ts` | slanje u delovima, nastavak posle prekida |
| `lib/upload-queue.ts` | red za slanje (2 fajla istovremeno), držanje ekrana upaljenim |
| `components/gallery.tsx` | galerija, filteri, lightbox, automatske nove slike |
| `lib/media.ts` | Drive URL-ovi za sličice, video i preuzimanje |
