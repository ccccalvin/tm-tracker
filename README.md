# tm-tracker

> *Log your papers. Climb the board.*

A login-gated web app where tutoring students log which past papers they've
completed and compete on a leaderboard. Static front-end (React + Vite) hosted on
**GitHub Pages**, backed by **Firebase** (Auth · Firestore · Storage).

The full product spec lives in [DESIGN.md](DESIGN.md).

---

## Stack

- **React 18 + TypeScript + Vite**, Tailwind + shadcn-style UI (shared design
  system with the sibling app *tmpdf*), `lucide-react`, `sonner`, `zustand`,
  `@dnd-kit` (drag-reorder), `react-router` (HashRouter for Pages).
- **Firebase**: Google sign-in, Cloud Firestore (data), Cloud Storage (PDFs).
- The paper **catalog is generated from PDF filenames** — see below.

## Quick start (local, no real Firebase project needed)

```bash
npm install

# Terminal 1 — Firebase emulators (Auth + Firestore + Storage + UI)
npm run emulators

# Terminal 2 — seed demo students + classes into the emulator, then run the app
npm run seed
echo "VITE_USE_EMULATORS=1" >> .env.local   # plus the VITE_FIREBASE_* placeholders
npm run dev
```

Open the app, click **Sign in with Google** — the Auth emulator lets you sign in
with any email. Sign in as **calvintkusnadi@gmail.com** to land as the admin.

> You still need a `.env.local` with the `VITE_FIREBASE_*` keys present (any
> non-empty placeholder values are fine in emulator mode). Copy `.env.example`.

## Connecting a real Firebase project

1. **Create the project** and enable the **Blaze** plan (required for Cloud
   Storage; expected cost ≈ $0 at class scale — set a budget alert).
2. **Auth** → enable **Google** sign-in. Add your Pages domain to authorized
   domains (`<user>.github.io`).
3. **Firestore** → create database (production mode).
4. **Storage** → create the default bucket.
5. Copy the web app config into `.env.local` (see `.env.example`).
6. **Deploy the security rules + indexes** (install the Firebase CLI first):
   ```bash
   npm i -g firebase-tools
   firebase login
   # set the project id in .firebaserc, then:
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```
7. **Bootstrap admin**: the first time **calvintkusnadi@gmail.com** signs in, their
   profile is created as an admin and the two default classes are seeded. To
   change the bootstrap email, edit both `src/lib/config.ts` and `firestore.rules`.

## Uploading the papers (PDFs)

The PDFs are **not** in the repo (866 MB). They live in Firebase Storage.

```bash
# 1. Put the PDFs in a folder named after the set id, e.g. yr12-advn-trials/
#    Filenames: "<School> <Year> 2U Trials & Solutions.pdf"
# 2. Regenerate the catalog from those filenames (commit the result):
npm run catalog
# 3. Upload the PDFs to Storage (needs a service account key — see the script):
FIREBASE_STORAGE_BUCKET=<your-bucket>.appspot.com npm run upload-pdfs
```

Only files containing **"& Solutions"** are added (every paper ships with worked
solutions). The default catalog view shows **2018+**; a toggle reveals older
papers. To add another set later, drop a new folder of PDFs, register it in
`scripts/generate-catalog.mjs` (`SETS`), and re-run `npm run catalog`.

## Deploying to GitHub Pages

1. Push to GitHub; **Settings → Pages → Source = GitHub Actions**.
2. Add the six `VITE_FIREBASE_*` values as **repository secrets** (Settings →
   Secrets and variables → Actions).
3. Push to `main` — [.github/workflows/deploy.yml](.github/workflows/deploy.yml)
   builds and deploys. The build uses Vite `base: './'` + HashRouter, so it works
   from any Pages path without 404s on refresh.

## Scripts

| Command | What |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | `tsc -b && vite build` (the type-safe production build) |
| `npm run typecheck` | `tsc -b` only |
| `npm run test` | Vitest unit tests (pure logic: catalog, ranking, stats, format) |
| `npm run catalog` | Regenerate `src/data/catalog.json` from PDF filenames |
| `npm run upload-pdfs` | Upload local PDFs → Firebase Storage |
| `npm run emulators` | Start Firebase emulators |
| `npm run seed` | Seed demo data into the emulator |

## Project layout

```
src/
  lib/        firebase init, db (all Firestore ops), catalog, ranking, stats, format, config
  hooks/      live Firestore subscription hooks (useData)
  store/      zustand stores (auth, theme)
  components/ ui/ (design system) · Layout · shared (ClassBadge, PdfOpenButton, StatStrip…)
              leaderboard/ · tracker/ · admin/
  pages/      Login · Onboarding · Home · Tracker · Admin · StudentTracker
  data/       catalog.json (generated, committed)
scripts/      generate-catalog · upload-pdfs · seed
firestore.rules · storage.rules · firestore.indexes.json · firebase.json
```

See [DESIGN.md](DESIGN.md) for the complete behavior spec.
