# Svadbena galerija

Gosti skeniraju QR kod, šalju slike i snimke direktno na Google Drive i gledaju zajedničku galeriju. Sve radi u browseru, bez instalacije.

- Next.js (App Router) na Vercelu, Tailwind CSS
- Upload ide direktno iz browsera na Google Drive (resumable, delovi od 8MB, nastavak posle prekida)
- Pristup štiti tajni ključ u QR linku; galerija nudi samo gledanje

**Podešavanje, test i puštanje live: [UPUTSTVO.md](UPUTSTVO.md).**

```bash
cp .env.example .env.local   # popuni po uputstvu
npm install
npm run key && npm run google:token && npm run drive:setup
npm run dev
```
