# tm-tracker — Design Specification

> *"Log your papers. Climb the board."*

A login-gated website where tutoring students log which past papers they've completed. The home page is a leaderboard of the top students by papers done. Hosted on **GitHub Pages**, backed by **Firebase** (Auth + Firestore + Storage).

This document is the agreed design from the planning interview. It is the source of truth for what we're building.

---

## 1. Goal & context

- **Who:** Calvin, a NSW HSC Mathematics tutor (brand: **TM**), running two classes.
- **What:** Students log completed past papers (NSW 2U / Mathematics Advanced trial papers), track their own progress privately, and compete on a leaderboard.
- **Catalog scale:** 52 schools, **487** papers with solutions (~**176** from 2018 onward), **866 MB** of PDFs.

---

## 2. Architecture overview

| Concern | Choice |
|---|---|
| **Hosting** | GitHub Pages (static site) |
| **Auth** | Firebase Authentication — Google sign-in only |
| **Database** | Cloud Firestore |
| **PDF storage** | Firebase Storage (Blaze plan — expected cost ≈ $0; budget alert set) |
| **Catalog source of truth** | **PDF filenames** (no markdown, no DB-entered catalog) |
| **Recommended frontend stack** | Vite + React + TypeScript; `dnd-kit` for drag-reorder; Firebase JS SDK *(open for confirmation)* |
| **Deploy** | GitHub Actions → GitHub Pages |
| **Responsiveness** | Fully mobile-friendly (students mostly on phones) |
| **Live updates** | Firestore real-time listeners — leaderboard updates without refresh |

### Catalog generation
The catalog is **derived from PDF filenames**, which follow the pattern:

```
[School] [Year] 2U Trials & Solutions.pdf      ← included  (has solutions)
[School] [Year] 2U Trials.pdf                  ← excluded  (no solutions)
```

- "2U" = Mathematics Advanced (the "ADVN" set).
- Presence of **"& Solutions"** is the inclusion filter — files without it are **not** added to the catalog.
- Each included file → one paper, displayed as **`[School] [Year] Trials`** (e.g. `Knox 2021 Trials`).
- A stable **paper ID** is derived from the filename slug (e.g. `knox-2021`), used as the key for completions/to-dos.

A **sync script** (run on add) uploads new PDFs to Firebase Storage and regenerates `catalog.json` (bundled into the build). Drop in new PDFs → run sync → push → they appear. Adding a new `.md`-style *set* later (e.g. HSC papers, Year 13) = a new folder/prefix; its **Type** label comes from the set.

### Year scope & toggle
- **Default catalog view:** solutions-papers with **year ≥ 2018** (~176 papers).
- A **toggle** reveals **older (pre-2018)** solutions-papers too.
- The toggle is display-only — **completing any solutions-paper counts** toward the leaderboard, regardless of year.

---

## 3. Roles & access

| Role | How assigned | Capabilities |
|---|---|---|
| **Visitor (not signed in)** | — | Sees only the landing/sign-in screen. Nothing else (login-gated). |
| **Student (signed in)** | Anyone with a Google account | Full app: log papers, private scores/notes, to-do list, personal stats. **Not on the leaderboard** unless flagged TM. |
| **TM student** | Admin flips a toggle | Same as student **+ appears on the leaderboard** (global + their class). |
| **Admin** | Bootstrap = `calvintkusnadi@gmail.com`; admins can promote others | Everything + Admin page + Student Tracker viewer. |

- **Open sign-up:** anyone with Google can sign in and use the app as a personal tracker.
- **Curated board:** only **TM students** appear in rankings.
- **Admin is a stored flag** (not a hardcoded allowlist beyond the single bootstrap account). Admins can promote/demote other admins and toggle TM status.

---

## 4. Auth & onboarding flow

1. **Not signed in →** landing screen: brand/logo + tagline *"Log your papers. Climb the board."* + **"Sign in with Google"**. Nothing else visible.
2. **First sign-in →** profile setup screen: **Display name** (required) + **Class** (required dropdown). Nothing else.
3. **Returning user →** straight to Home.
4. **Non-TM student's Home →** in place of their personal rank entry, a gentle banner: *"You're tracking privately — ask Calvin to add you to the leaderboard."*

- **Class is locked after signup** — only an admin can reassign it.
- **Display name** is editable anytime (options modal).

---

## 5. Navigation

Top navbar (brand left; links; right side: 🌙 dark/light toggle · user's name · ⚙️ options cog) — modeled on the provided reference.

**Student navbar:** brand · **Home** · **Tracker** · … · 🌙 · *name* · ⚙️
**Admin navbar:** brand · **Home** · **Student Tracker** · **Admin** · … · 🌙 · *name* · ⚙️

**Options modal (⚙️):** editable display name · (locked) class · "Signed in as" email (read-only) · Sign out. *(Dark/light lives in the navbar, not duplicated here.)*

---

## 6. Home page

### 6.1 Leaderboard
- **Tabs:** **All** (default) · **Mon ADVN** · **Fri ADVN** (a tab per class; new classes add tabs).
- Shows the **top 5 rank positions** within the selected scope. **Ties share a rank**, so more than 5 people may show (e.g. 1, 2, 3, 3, 4, 5).
- **Top-3 rows** softly shaded pastel **gold / silver / bronze**; 4th/5th plain.
- **Three columns:** plain **rank number** (no "#") · **name + class badge** (`MON ADVN` / `FRI ADVN`) · **paper count** ("37 papers").
- No emoji, no profile photos, no progress bars on the board.
- **Count = total completed across all sets**, all years.

### 6.2 Personal section (below the board)
```
🏆 Leaderboard
 1   Alice   MON ADVN      42 papers
 2   Bob     FRI ADVN      39 papers
 ...
──────────────────────────────────
 You
 12  Calvin  MON ADVN      18 papers      ← standalone, visibly separated
──────────────────────────────────

┌─ Stats ─────────────────┬─ Last 5 completed ───────────┐
│ Total completed:  37    │ Knox 2021 Trials · 3d · 78%  │
│ Average score:    78%   │ Manly 2023 Trials · 5d · 64% │
│ This week:        +4    │ …                            │
└─────────────────────────┴──────────────────────────────┘
```
- **Standalone "You" entry** directly under the board (same row style, visibly separated) — shows the signed-in TM student's own rank, even if outside the top 5.
- **Stats block (left):** Total completed · Average score (% across papers where a score was entered) · This week (papers in last 7 days).
- **Last 5 completed (right):** paper label · how long ago · score (score visible only to the owner).
- **Admin's Home** hides the personal entry/stats (admin isn't a TM student) — just the leaderboard.
- **Non-TM student** sees the "ask Calvin to add you" banner instead of a rank entry.

---

## 7. Tracker page

Two stacked sections; the page scrolls (the full list is long and need not fit the viewport).

### 7.1 To-do list (top)
- A personal queue. **Adding a paper copies it here** (it stays in the full list too).
- **Drag-to-reorder** with clean UX.
- **✕** to remove an item (doesn't affect the full list).
- Can **mark complete from here**; completed items **stay in the to-do list, shaded** (not struck-through) — color from the palette.
- **Unified across sets** — one queue holds papers from any set, distinguished by their Type label.

### 7.2 Full paper list (bottom)
- Flat rows: **`[School] [Year] Trials`**, **alphabetical** by default.
- **Search bar** (by school / year / text).
- **Filter:** completed vs uncompleted.
- **Year toggle:** default ≥ 2018; toggle to include older papers.
- **Set switcher** appears only when more than one set exists.
- Each row: **instant-tick checkbox** (commits immediately, updates count) · **inline, optional** "add score / notes" expander (no modal) · **"add to to-do"** action · a **paper/PDF icon** that opens the PDF in a new browser tab.
- **Completed rows shaded** (palette color).

### 7.3 Logging mechanics
- One tap on the checkbox = done & counted (leaderboard updates live).
- Optional **score (percentage 0–100%)** and **notes** added inline, anytime.
- **Privacy:** score + notes are visible **only to the student and admins**. A clear, visible reassurance is shown: *"Your scores and notes are private — only you and your teacher can see them. Other students only see how many papers you've completed."*

---

## 8. Admin pages

### 8.1 Admin page
1. **Users table** — one table, **filterable** (All / TM only / Not TM), TM students sorted to top. Columns: name · class · paper count · last active. Per-row actions: **TM-student toggle**, **admin toggle**, **class reassign**, **remove user** (with confirm dialog).
2. **Classes manager** — add a class (full name e.g. *"Calvin's Saturday ADVN"* + short badge e.g. `SAT ADVN`), rename, archive.
3. **Activity feed** — recent stream across all students (*"Alice completed Knox 2021 Trials · 2:43pm"*) so anomalies (e.g. 40 ticks in a minute) are obvious. Honor system + oversight.

> The **catalog is not managed here** — papers come from PDF filenames via the sync script. The Admin page is about *people*, not papers.

### 8.2 Student Tracker (admin)
- Same as the student Tracker page, but with a **student picker** to view any student's tracker — their to-do, completions, scores, and notes (admins can see private data).

---

## 9. Classes

- **Admin-controlled list.** Initial classes:
  - **Calvin's Monday ADVN** → badge **MON ADVN**
  - **Calvin's Friday ADVN** → badge **FRI ADVN**
- Each class has a **full name** + a **short badge**. Admins add/rename/archive.

---

## 10. Ranking logic

- **Eligibility:** only **TM students** are ranked.
- **Metric:** total completed papers (across all sets/years).
- **Scope:** global (All) or per-class, via tabs.
- **Ties:** **shared rank** (same count = same rank number).
- **Display:** top **5 rank positions** per scope (ties can mean >5 people shown).
- **Your rank:** every TM student sees their own position, even outside top 5.

---

## 11. Visual design

- **Aesthetic:** clean, minimal, modern — rounded cards, thin borders, generous whitespace, subtle shadows.
- **Typography:** Inter (or similar clean sans-serif).
- **Theme:** **default light**, with a **dark/light navbar toggle**.

| Token | Light | Dark | Used for |
|---|---|---|---|
| Accent | Indigo `#4f46e5` | Indigo `#818cf8` | Buttons, links, active tab, your-rank highlight |
| Background | `#ffffff` / `#f8fafc` | `#0f172a` / `#1e293b` | Page / cards |
| Text | `#0f172a` | `#e2e8f0` | Body |
| Completed shade | Mint `#ecfdf5` | Deep green `#064e3b` | Completed papers / to-do items |
| Gold / Silver / Bronze | `#fef9c3` / `#f1f5f9` / `#fde9d7` | muted equivalents | Top-3 leaderboard rows |

---

## 12. Data model (Firestore)

```
users/{uid}
  displayName, email, classId, role ('student'|'admin'),
  isTMStudent (bool), paperCount (int, denormalized), lastCompletedAt, createdAt

users/{uid}/completions/{paperId}
  paperId, paperLabel, completedAt, score (0–100 | null), notes (string | null)

users/{uid}/todos/{paperId}
  paperId, paperLabel, order (for drag), addedAt, done (bool)

classes/{classId}
  name, badge, archived (bool)
```
- **Activity feed** via a `collectionGroup` query on `completions` (indexed), or a dedicated `activity` collection written on completion.
- **`paperCount`** denormalized on the user doc for cheap leaderboard queries (`where isTMStudent == true, orderBy paperCount desc`).
- **`catalog.json`** (build-time, from filenames) holds the paper list + Storage paths; not in Firestore.

### Security rules (intent)
- Only **signed-in** users read app data (login-gated).
- A user reads/writes **their own** completions & to-dos; **admins** can read any.
- **Public-ish leaderboard fields** (displayName, classId, isTMStudent, paperCount) readable by any signed-in user; **score/notes readable only by owner + admins**.
- Only **admins** can write `isTMStudent`, `role`, `classId` (reassignment), and `classes/*`.

---

## 13. What Calvin provides / setup checklist

- [ ] Firebase project + **Blaze plan** enabled (budget alert recommended).
- [ ] Google sign-in enabled in Firebase Auth.
- [ ] Bootstrap admin seeded: **calvintkusnadi@gmail.com**.
- [ ] PDFs uploaded to Firebase Storage via the sync script (from `yr12-advn-trials/`).
- [ ] GitHub repo + Pages enabled; Firebase web config added; GitHub Actions deploy.

---

## 14. Out of scope (for now / future ideas)

- Per-set leaderboards (only unified total for now).
- Leaderboard by average score.
- In-app admin **PDF upload UI** (sync script handles uploads initially).
- Profile photos on the board (deliberately excluded for privacy).
- Email/password or magic-link auth (Google only).
