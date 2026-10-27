# CLAUDE.md — VVITU × ToriiMinds

Guidance for Claude Code (and any developer) working in this repository. Read this
before touching anything: a lot of what looks like an arbitrary choice here is load-bearing.

---

## 0. Read this first — what this repo is a copy of

This project is a **replica of the SRKR × ToriiMinds site**, stood up for VVITU. The
architecture, the registration engine, the coding-profiles module, the SCSS layer and
every house rule below are identical; `srkr` was renamed to `vvitu` throughout
(directories, class names, collection names, the `TM-VVITU-######` registration-ID
prefix). Keep the two projects in sync in spirit, but they are **separate deployments
against separate databases** — see §3.

### Switched off for the VVITU launch

| What | How it is off | How to restore |
|---|---|---|
| **"Meet Our Team"** | `<Team />` commented out in `components/vvitu/index.jsx`, plus its nav entry in the header and its footer link. `team.jsx`, `team-data.js` and `public/portfolios/` are untouched. | The comment block at the `<Team />` render |

### The admin panel is LIVE (restored 2026-10-26)

It was parked in Next.js private folders (`app/_admin`, `app/api/_admin`) for the
launch. It is now back at `app/admin` and `app/api/admin`, the `/dashboard → /admin`
redirects in `next.config.js` are uncommented, and `DISABLED.md` is gone. All four
pages and all twelve admin endpoints are in the build — verified against a production
build and exercised end to end.

Three things changed in the restore beyond the rename:

1. **A new, empty Atlas cluster** — see §3. The SRV connection string does not resolve
   on the current machine; the seed-list form is used instead, and the reason is
   written at the top of `.env.local`.
2. **The coding-profiles catalogue no longer self-seeds.** SRKR seeds a `skillup-coder`
   program so its pre-existing captures are not orphaned; VVITU has no such history and
   does not run SkillUp Coder, so the seed would have invented a program. `SEED` in
   `lib/coding-profiles/program-store.js` is now `[]` and the panel shows its
   "No programs yet" state, wired to the creation wizard.
3. **The academics charts were un-hardcoded from Moon Coder** — see §8.2.

### ⚠️ Content still carried over from SRKR

The replica copied SRKR's content wholesale. What remains wrong for VVITU, with
`TODO(VVITU)` against it in the code:

1. **The year-wise WhatsApp groups and the Moon Coder group**
   (`lib/site-config.js`) — not created yet, so they render as non-clickable
   "Link coming soon" rows. SRKR's invites were *removed* rather than left in
   place: a live link here would drop a VVITU student into another college's
   group, which is worse than no link. ✅ The **main community invite is live**
   (2026-10-27).
2. **Photography** — most of `public/assets/images/vvitu/project-images/` is still
   SRKR's: campus shots and parts of the hero gallery. Already handled: the MOU
   signing slide is commented out (it was SRKR's signing), and the AI partners
   slide was replaced with VVITU's own.
3. **Syllabus copy** (`components/vvitu/programs-data.js`) — the module text is
   still SRKR's wording, pending VVITU's revisions. The *structure* is correct:
   AI Ready is the only open intake, its five courses are set, and the
   AI-integration content was stripped out.
4. **Team members** (`components/vvitu/team-data.js`) — only matters if the Team
   section is ever restored.

**Done since this list was written:** the B.Tech branch list is now VVITU's six
departments with an `OTHER_BRANCH` free-text fallback, so no VVITU student is
blocked by a missing branch.

Fix 1 before advertising the groups; 2 and 3 before a wider launch.

---

## 1. What this project is

The public-facing site for the **ToriiMinds × Vasireddy Venkatadri International Technological University (Guntur)**
collaboration, plus the **internal admin panel** that runs it.

Two halves living in one Next.js app:

| Half | Who sees it | What it does |
|---|---|---|
| **Landing page** (`/`) | VVITU students, publicly indexed | Markets the training programs, shows syllabi and takes program registrations. (The team section is disabled — see §0.) |
| **Admin panel** (`/admin/*`) | ToriiMinds staff, `noindex`, passcode-gated | Registration analytics + Excel export, the coding-profiles leaderboard, and the home-page announcement pop-up. **Live since 2026-10-26 — see §0.** |

It is a **standalone** project. It imports nothing from the main Torii frontend or
backend, and nothing imports it. There is no LMS inside this repo — the site is the
entry point that precedes it.

### The programs

Five training tracks, each tied to a passout year:

| Program | Code | Year | Passout | Status |
|---|---|---|---|---|
| **AI Ready Engineers** | `AIR-300` | **2nd** | 2029 | **OPEN** — the only live intake |
| Bamboo Coder | `BMB-100` | 1st | 2030 | Coming Soon |
| SkillUp Coder | `SKL-200` | 2nd | 2029 | Coming Soon |
| Moon Coder | `MOON-200` | 2nd | 2029 | Coming Soon |
| Owl Coder | — | expert | — | Showcase only; never had an intake |

**VVITU offers only AI Ready Engineers, and only to 2nd years** — note the year differs
from SRKR, where the same track runs for 3rd years. Everything else is a Coming Soon
card: no status badge, no year pill, no Explore Syllabus button. Opening or closing an
intake is a deliberate two-flag operation — see §8.1.

Because AI Ready carries `academics: true`, its registrations collect CGPA, active
backlogs, how the student joined and (for lateral entry) a diploma CGPA. Those must stay
wired to the dashboard — see §8.2.

---

## 2. Stack, versions and tooling

| Thing | Version | Notes |
|---|---|---|
| **Next.js** | `^14.2.3` | **App Router.** Not the Pages Router, not Next 15. |
| **React** | `18.2.0` | Pinned exactly. |
| **Node.js** | ≥ 18.17 required; **v24.14.0** in use | Next 14's floor is 18.17. |
| **Package manager** | **npm** (`11.9.0`) | `package-lock.json` is committed. No yarn/pnpm lockfile — don't add one. |
| **Language** | **JavaScript only** | No TypeScript. `jsconfig.json` sets `baseUrl: "."` but imports are relative throughout — there is no `@/` alias. |
| **Database** | MongoDB Atlas, driver `mongodb@^7.6.0` | No ODM. No Mongoose. Raw driver, hand-written indexes. |
| **Styling** | **Sass** (`^1.64.2`) + CSS custom properties | No Tailwind, no CSS modules, no styled-components. |
| **Animation** | `framer-motion@^13.1.1` | |
| **Charts** | `recharts@^3.10.1` | Lazy-loaded; see §8.6. |
| **Carousel** | `react-slick` + `slick-carousel` | |
| **Excel** | `exceljs@^4.4.0` | Reads uploads *and* writes exports. |
| **Images** | `sharp@^0.35.3` | In `dependencies`, unlike the SRKR original — see §8.9. |
| **Fonts** | `next/font/google` — Plus Jakarta Sans (body), Outfit (headings) | Also `@import`ed in `globals.scss` as a belt-and-braces fallback. |
| **Linting** | `eslint` + `eslint-config-next` | No Prettier config, no pre-commit hooks. |
| **Hosting** | Vercel | No `vercel.json`; defaults are used. |

**No test framework is configured.** There are no unit tests, no integration tests and
no CI. Verification is done by running the app — see §8.11.

---

## 3. Getting it running

```bash
npm install
npm run dev          # http://localhost:3000
```

> If the SRKR project is already running on 3000, start this one elsewhere:
> `npx next dev -p 3100`.

Scripts: `dev`, `build`, `start`, `lint`. That is the complete set.

### Environment variables

Create `.env.local` in the repo root (git-ignored). Four variables, all server-side:

```bash
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/?retryWrites=true&w=majority
MONGODB_DB=vvitu                       # optional, defaults to 'vvitu'
MONGODB_COLLECTION=vvitu_registrations # optional, defaults to 'vvitu_registrations'
DASHBOARD_PASSCODE=<your-secret>      # gates every /admin page and /api/admin/* route
```

> ⚠️ **`MONGODB_DB` must not be `srkr`.** This site may share the Atlas cluster with the
> SRKR project, but never the database: registrations, the coding roster, snapshots and
> announcements are all plain per-collection reads, so a shared database merges two
> universities' student records into one dataset with no way to tell them apart.
>
> As of 2026-10-26 VVITU has its **own cluster**, so the two projects no longer share any
> infrastructure at all. It was verified empty — `admin` and `local` only — before the
> panel went live. The cluster's address and credentials are in `.env.local`, which is
> git-ignored and handed to whoever deploys, out of band.

#### The SRV connection string may not resolve

The URI above is the form Atlas gives you, and it is **not** what `.env.local` uses.
`mongodb+srv://` requires a DNS SRV lookup to discover the shard hosts, and on the
machine this was set up on that lookup is refused outright — `querySrv ECONNREFUSED
_mongodb._tcp.<cluster>.mongodb.net`, in under 20ms, because the resolver in use does not
serve SRV records. **This is a DNS problem, not a credentials problem**, and it will look
like an unreachable database if you only read the error. The sub-20ms failure is the
tell: a real network or auth problem takes seconds to time out.

The seed-list form names the three shard hosts directly and needs no SRV lookup:

```bash
MONGODB_URI=mongodb://<user>:<pw>@<host>-00.mongodb.net:27017,<host>-01.mongodb.net:27017,<host>-02.mongodb.net:27017/?ssl=true&replicaSet=<rs>&authSource=admin
```

Atlas shows the real one under **Connect → Drivers → "older driver version"**.

Measured: connects in 1.6s, insert/read/drop round-trips. Both strings reach the same
cluster — on a host with a normal resolver (Vercel included) prefer the SRV form. Both
are in `.env.local`, one commented.

Optional: `NEXT_PUBLIC_SITE_URL` (defaults to `https://vvitu.toriiminds.com`) — only
affects OG/canonical metadata.

On Vercel, set the same four in **Project → Settings → Environment Variables**.

**Without `MONGODB_URI`** every database call throws a clear error. **Without
`DASHBOARD_PASSCODE`** the admin panel refuses all logins and reports itself as
unconfigured rather than falling open — that is intentional.

### First-run bootstrap

Indexes are created lazily and idempotently on first access, so an empty Atlas cluster
needs no migration step. The coding-profiles program catalogue **self-seeds** one
program (`skillup-coder`) on first read so historical uploads are never orphaned.

---

## 4. Repository map

```
.
├── app/                              # Next.js App Router
│   ├── layout.jsx                    # Root layout: fonts, full SEO metadata, viewport
│   ├── page.jsx                      # '/' → renders <VvituMain/>
│   ├── globals.scss                  # Imports all 8 SCSS partials + base/footer styles
│   ├── admin/                        # 4 admin pages + server layout (noindex)
│   └── api/                          # 16 route handlers
├── components/vvitu/                  # Every component. All live under this one folder.
│   ├── index.jsx                     # Landing-page orchestrator — modal + announcement state
│   ├── vvitu-header.jsx               # Sticky nav, scroll-spy, WhatsApp + Register buttons
│   ├── who-we-are.jsx                # Hero + 15-slide story gallery
│   ├── programs.jsx                  # Program carousel (react-slick)
│   ├── programs-data.js              # ⭐ 1554 lines — full syllabus content for all 5 programs
│   ├── program-detail-modal.jsx      # Syllabus deep-dive modal
│   ├── courses.jsx                   # 8 course cards across the programs
│   ├── team.jsx / team-data.js       # 6 team members, photos, portfolio links
│   ├── certifications.jsx            # ⚠️ ORPHANED — not imported anywhere (§10)
│   ├── team.jsx                      # ⚠️ Rendered nowhere right now — see §0
│   ├── vvitu-footer.jsx
│   ├── registration-modal.jsx        # ⭐ 1215 lines — the whole registration flow
│   ├── announcement-modal.jsx        # Auto-opening poster pop-up
│   ├── whatsapp-community-modal.jsx  # Community + year-wise group chooser
│   ├── admin/                        # Admin shell, rail, home, analytics, announcements
│   └── dashboard/                    # Login gate, KPI/chart/table pieces
│       └── coding/                   # ⭐ 20 files — the coding-profiles module
├── lib/                              # All business logic. No React here.
│   ├── site-config.js                # External links (WhatsApp, partner sites)
│   ├── registration-schema.js        # ⭐ Program catalogue + validation. Shared client+server.
│   ├── registration-eligibility.js   # Roster-gating + pre-fill (SERVER ONLY)
│   ├── mongodb.js                    # Registrations + announcements collections, indexes
│   ├── dashboard-auth.js             # Passcode → sha256 cookie, timing-safe compare
│   ├── analytics-range.js            # IST-aware date ranges for stats + export
│   └── coding-profiles/              # 11 files — the leaderboard engine (§6)
└── public/
    ├── assets/scss/vvitu/             # 8 partials, ~14,300 lines total
    │   ├── _vvitu-theme.scss          # ⭐ ALL colour/typography tokens (~90 lines)
    │   └── _vvitu-sections.scss       # Landing-page styles (~7,300 lines)
    ├── assets/images/vvitu/           # Banners, team cut-outs, roadmap badges, platform logos
    └── portfolios/                   # Static HTML team portfolio pages
```

### Files that are *not* source

Loose `.xlsx` / `.csv` files in the repo root (`SkillUp_Coder_Batch_Allocation.xlsx`,
`Coding_Profiles_Final_2026-10-15.csv`, …) are **working data, not fixtures**. They
contain real student names, mobile numbers and emails. `.gitignore` excludes `*.xlsx`
and `*.csv` wholesale — **keep it that way and never commit one.**

---

## 5. Pages and endpoints

### Pages — 5

| Route | File | What it is |
|---|---|---|
| `/` | `app/page.jsx` | **The landing page.** One scrolling document: Header → Who We Are → Programs → Courses → Selection Process → ~~Team~~ → Footer, with three modals layered on top (registration, announcement, WhatsApp). |
| `/admin` | `app/admin/page.jsx` | **Overview.** Every module at a glance. |
| `/admin/analytics` | `app/admin/analytics/page.jsx` | **Registrations analytics** — KPIs, the academics block (CGPA, diploma CGPA, backlogs, admission route), charts by program/branch/gender/residence/laptop, recent table, Excel export. |
| `/admin/coding-profiles` | `app/admin/coding-profiles/page.jsx` | **Coding profiles** — leaderboard + analytics over LeetCode / CodeChef / HackerRank / GeeksforGeeks captures. Starts with an empty catalogue; create a program with the wizard. |
| `/admin/announcements` | `app/admin/announcements/page.jsx` | **Announcements** — upload/publish the home-page poster pop-up. |

`/dashboard*` permanently redirects to `/admin*` (`next.config.js`) because the panel
used to live there and bookmarks still exist.

### API — 16

Every one is `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`. Nothing is cached or
prerendered — these all read live data.

**Public:**

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/register` | `POST` | Submit a registration. `GET` is a health check. |
| `/api/register/lookup` | `GET` | Type-ahead over the eligibility roster (roster-gated intakes only). Returns name/roll/branch/batch — **never contact details**. |
| `/api/announcements/active` | `GET` | The currently published announcement, if any. |
| `/api/announcements/image/[id]` | `GET` | Streams a poster out of MongoDB. |

**Admin — every one guarded by `isAuthenticated(request)`, which returns 401 to an
unauthenticated caller (verified on all twelve):**

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/admin/login` | `GET POST DELETE` | Session check / sign in / sign out. |
| `/api/admin/overview` | `GET` | Cross-module summary for `/admin`. |
| `/api/admin/registrations/stats` | `GET` | Analytics aggregates. |
| `/api/admin/registrations/export` | `GET` | Streams a formatted `.xlsx`. |
| `/api/admin/announcements` | `GET POST` | List / create (image resized by `sharp`). |
| `/api/admin/announcements/[id]` | `PATCH DELETE` | Publish-toggle / edit / remove. |
| `/api/admin/coding/programs` | `GET POST` | Program catalogue. |
| `/api/admin/coding/programs/[code]` | `DELETE` | Remove a program. |
| `/api/admin/coding/roster` | `POST` | Upload the batch-allocation workbook. `maxDuration = 30`. |
| `/api/admin/coding/upload` | `GET POST` | Upload a capture. `?dryRun=1` previews without writing. `maxDuration = 30`. |
| `/api/admin/coding/overview` | `GET` | KPIs, podium, analytics for a scope + period. |
| `/api/admin/coding/students` | `GET` | The paged student directory. |

---

## 6. The two subsystems worth understanding before editing

### 6.1 Registration

`lib/registration-schema.js` is the **single source of truth** and is imported by **both**
the client modal and the `/api/register` route. That is deliberate: the two can never
drift. The client's validation is a UX convenience; the server **always** re-runs
`validateRegistration()` and that is the check that gates the write.

Key properties:

- **Program-derived fields.** `passoutYear`, `programCode`, `programName`, `programTrack`
  and `yearLabel` are all derived server-side from the program key. A tampered request
  cannot register itself into a program it didn't earn.
- **Per-program uniqueness.** Unique indexes are compound: `{programCode, rollNumber}`
  and `{programCode, collegeEmail}`. A student may hold **one record per intake** — Moon
  Coder deliberately re-enrols students who already have a SkillUp record. Legacy
  single-field indexes are dropped automatically on first connect.
- **Roster-gated intakes** (`eligibility: 'skillup-roster'`, i.e. Moon Coder). The student
  picks themselves from the 317-student SkillUp roster, then types **only** CGPA,
  backlogs and time slot. Name, email, mobile, branch, gender, residence and laptop are
  read from their earlier SkillUp registration **on the server** — the browser never
  holds them and cannot alter them.
- **Registration IDs** are `TM-VVITU-<6 digits>`, random, with up to 5 retries on
  collision so a clash never surfaces to the student.
- **Body cap** 4096 bytes; oversized bodies are rejected with 413 before parsing.

### 6.2 Coding profiles

A leaderboard built from periodic scraper exports. The mental model:

- A **capture** is a cumulative snapshot of every student's platform stats at one moment.
  Uploads **append** — they never overwrite. The first capture is the T0 baseline and
  losing it would be unrecoverable.
- Three collections, deliberately separated:
  - `vvitu_coding_roster` — identity **and batch**. The scraper export has no batch
    column, so this is the permanent join table.
  - `vvitu_coding_snapshots` — one immutable document per upload, rows embedded.
  - `vvitu_coding_audit` — who uploaded what, when, replacing what.
- **Batch is never copied onto snapshot rows.** Joining 317 rows in Node is
  sub-millisecond, and keeping batch in exactly one place means a roster correction
  retroactively fixes every historical snapshot with zero writes. (There has already
  been one mid-program batch swap in this project.)
- **The total is a plain sum of counts** — no weights, no caps, no bonuses:
  `LeetCode solved + CodeChef problems + HackerRank stars + GFG programs`. Every number
  is one the student can read off their own profile page.
- **Rank is computed per request**, never read from the snapshot, because rank depends
  on the population being ranked. That is what makes "3rd in Batch 2" meaningful.
- **A period is a difference**, not a filter: last capture inside the period minus last
  capture before it. Drops (platform recounts, reset accounts) clamp to zero. No capture
  inside the period → the UI says so rather than quietly showing the nearest one.
- **Column mapping is by header *name*, never position.** The scraper's header is not a
  contract — the 2026-10-15 capture ships `gfg_total_progarms` (sic) and 13 of its 39
  columns are entirely empty. Matching is case/underscore/space-insensitive.
- **"Zero" and "not captured" are different things** and the distinction must survive
  all the way into the UI. A blank `gfg_score` is not a score of nought.
- **Uploads are two-phase.** `?dryRun=1` parses, joins, scores and previews without
  persisting; a second POST commits. This is not ceremony — on this dataset a
  half-broken scraper is visually indistinguishable from the truth, so the only real
  check is the join-rate regression guard (below 50% the upload is refused).
- Re-uploading a byte-identical file is caught by a unique `{programCode, sha256}` index.

---

## 7. Data model

Database `vvitu` (override with `MONGODB_DB`). Six collections:

| Collection | Holds | Key indexes |
|---|---|---|
| `vvitu_registrations` | One doc per student per intake | `uniq_program_rollNumber`, `uniq_program_collegeEmail`, `uniq_registrationId`, `idx_program_createdAt` |
| `vvitu_announcements` | Poster pop-ups, **images inline as Buffers** | `idx_active_created` |
| `vvitu_coding_programs` | The program catalogue (admin-created) | `uniq_code` |
| `vvitu_coding_roster` | Identity + batch per program | `uniq_program_roll`, `idx_program_batch` |
| `vvitu_coding_snapshots` | Immutable captures, rows embedded | `idx_program_current`, `idx_program_captured`, `uniq_program_sha` |
| `vvitu_coding_audit` | Upload trail | `idx_program_at` |

**Announcement images live in MongoDB as Buffers, not on disk.** Vercel's filesystem is
read-only and ephemeral per deploy, so anything uploaded at runtime must go to the
database to persist and be visible on every instance. Do not "fix" this by writing to
`public/`.

---

## 8. House rules — the things to be wary of

### 8.1 Opening or closing an intake is TWO flags

Never one. Both of these must agree:

1. `open: true|false` on the program in **`lib/registration-schema.js`**
   → gates the modal, `/api/register/lookup`, and the `/api/register` write (server-side).
2. `registrationsOpen` / `registrationsClosed` on the matching card in
   **`components/vvitu/programs-data.js`**
   → gates the badge and the button on the program card.

Flip one and the UI lies about the other. A closed intake returns **403 with
`closed: true`**, not a field-validation error — a stale tab deserves the real reason,
not a list of inputs to "correct" on a form that no longer accepts entries.

### 8.2 Form ↔ dashboard parity is mandatory

**Every change to the registration form must ship with the matching dashboard
analytics wiring in the same change.** Add a field to the form → add its chart/column to
`/admin/analytics` *and* to the Excel export. Remove one → remove it from both. The two
are expected to stay in lockstep; a field that is collected but never surfaced is a bug,
not a to-do.

**The academics block is keyed off `academics`, not off a program name.** This rule was
broken once already and it is worth knowing how, because the failure was invisible.
SRKR's analytics page rendered the CGPA and backlog charts inside a block gated on Moon
Coder — its roster-gated intake, the only one that collected them there. VVITU inherited
that gate, but here the academics intake is **AI Ready Engineers** and Moon Coder is a
Coming Soon card that will never hold a row. The result: AI Ready's CGPA and backlog
data rendered under a heading reading *"Moon Coder intake"*, and **vanished entirely the
moment you selected AI Ready** in the program tabs — the one view where you would look
for it.

Fixed 2026-10-26. `academics` now travels per-program in the `/api/admin/registrations/
stats` payload, and `registrations-analytics.jsx` shows the block for any program
carrying the flag. Adding `academics: true` to an intake is all it now takes. Two fields
that had been collected and exported but never charted were added at the same time:
`admissionType` (regular vs lateral entry) and `diplomaCgpa` — lateral-entry students
give a diploma CGPA *instead of* a B.Tech one, so they are absent from the CGPA chart by
construction and had no chart of their own.

The Moon-Coder-specific widgets (uptake against its shortlist roster, class time slots)
are still gated to Moon Coder, which is correct — those are genuinely about that intake.

### 8.3 Every UI change is responsive by default

Phone, tablet and desktop. This is not a follow-up task and you will not be reminded.
Existing components already carry three distinct layouts (the admin rail is a good
reference: desktop rail → tablet overlay drawer → phone bottom tab bar). Match that bar.

### 8.4 No hardcoded colours. Ever.

Every colour in every VVITU component **must** reference a token from
`public/assets/scss/vvitu/_vvitu-theme.scss`. Write `var(--vvitu-primary)`, never `#E2544C`.
If you need a colour that doesn't exist, add a token — don't inline a hex.
Reference palette: `torii-color-palette.html` in the repo root.

### 8.4b Appending a style override? Qualify the selector.

`_vvitu-sections.scss` is ~7,500 lines and its base rules are written **nested**,
so they compile to descendant selectors with real specificity:

```scss
.vvitu-program-card { .vvitu-program-btn { background: var(--vvitu-bg-coral-tint); } }
//  -> .vvitu-program-card .vvitu-program-btn   (0,2,0)
```

A new rule appended at the end of the file with a flat selector
(`.vvitu-program-btn--soon`, 0,1,0) **loses**, even though it comes later —
later only wins at *equal* specificity. The failure is quiet: the element keeps
the old look and nothing errors. This has already bitten twice here (the frosted
Coming Soon plate came out coral; the disabled WhatsApp CTA stayed green while
reading "coming soon").

Match the nesting instead of reaching for `!important`:

```scss
.vvitu-program-card .vvitu-program-btn.vvitu-program-btn--soon { … }
```

And verify by reading `getComputedStyle()` in the browser, not by looking at a
screenshot — a wrong-but-plausible colour is exactly what the eye skips over.

### 8.5 Excel exports: branch is the short code only

Department columns in generated workbooks use the **short code with no ampersand** —
`AI&DS` → `AIDS`, `CS&IT` → `CSIT`. `branchOptionForCode()` in `registration-schema.js`
resolves both directions; use it rather than string-munging at the call site.

### 8.6 recharts is lazy-loaded on purpose

It is the single largest dependency on the coding-profiles page and only the Analytics
tab draws a chart, so it's `next/dynamic` with `ssr: false`. Don't static-import it into
the leaderboard path — that re-ships the whole library to every visitor and drags
recharts' layout-effect mounting into the server render.

### 8.7 Never import server-only libs into client components

`lib/registration-eligibility.js`, `lib/coding-profiles/store.js` and
`lib/coding-profiles/program-store.js` reach the database. They are server-only. The
shared-logic modules (`registration-schema.js`, `coding-profiles/period.js`,
`programs.js`, `score.js`, `boards.js`, `cohort.js`) are deliberately pure and safe on
both sides — keep them that way.

### 8.8 Dates: IST for registrations, UTC for captures

Two different clocks, both deliberate:

- **Registration analytics** (`lib/analytics-range.js`) compute day boundaries in **IST
  (+05:30)** with explicit offset math, because "today" must mean today in Guntur.
  Vercel runs in UTC — never trust the machine timezone here.
- **Capture periods** (`lib/coding-profiles/period.js`) are pure UTC on `YYYY-MM-DD`
  strings, so a period never drifts by a day.

Don't unify them.

### 8.9 `sharp` is a runtime dependency — keep it in `dependencies`

`sharp` is imported at **runtime** by `app/api/admin/announcements/route.js` and
`.../[id]/route.js`. In the SRKR original it sat in `devDependencies` and survived only
because Vercel installs dev dependencies during build; any install that omits them
(`npm ci --omit=dev`, a trimmed Docker stage, some CI setups) broke announcement uploads
with a module-not-found. **That is fixed here** — it has been moved to `dependencies`.
Don't move it back. `@imgly/background-removal-node` is genuinely dev-only.

### 8.10 Student PII never leaves the machine

Registration records hold names, mobile numbers and college emails.

- `.gitignore` blocks `*.xlsx`, `*.csv` and `/attempted_details_round1/`. Don't weaken it.
- The admin panel is `robots: { index: false, follow: false }`, set in a **server**
  layout — a client layout would silently drop the metadata export, so keep
  `app/admin/layout.jsx` server-side.
- `/api/register/lookup` returns name/roll/branch/batch only. Never widen it.
- Don't paste student data into commits, issues or external services.

### 8.11 There are no tests — verify by running

Claims of "it works" must be backed by actually exercising the path. For UI work that
means loading the page; a headless-Chrome CDP screenshot is the established technique
here (note: a full-page capture can blank recharts bars — that's a capture artefact, not
a rendering bug). For API work, hit the endpoint. `GET /api/register` is a live
API+database health check.

### 8.12 Comment style

The existing code explains **why**, not what — and it is unusually thorough about it
(see `lib/coding-profiles/store.js` or `columns.js` for the register). Match that. When
you remove a feature, the established pattern is to leave the code commented with a note
on how to restore it (see the retired CRT-fee field in `registration-schema.js`).

---

## 9. Replication checklist

To stand this project up from scratch:

1. **Node ≥ 18.17** and npm. `git clone`, then `npm install`.
2. **MongoDB Atlas** — create a cluster and a database user. No schema setup needed;
   indexes and the seed program are created on first access.
3. **`.env.local`** — the four variables in §3. Pick a real `DASHBOARD_PASSCODE`.
4. `npm run dev` → http://localhost:3000. The landing page should render with all
   intakes closed, no "Our Team" nav entry, and the VVITU mark in the header.
5. `/admin` 404s by design — restore it first (§0) if you need the panel.
7. **Seed the coding-profiles module** (optional): create a program, upload a batch
   allocation workbook via `/api/admin/coding/roster`, then upload a capture with
   `?dryRun=1` and review before committing.
8. **Replace the content you don't own:**
   - `components/vvitu/team-data.js` + photos in `public/assets/images/vvitu/project-images/team/`
   - `components/vvitu/programs-data.js` — the syllabus content
   - `lib/site-config.js` — WhatsApp invite links and partner URLs
   - `public/assets/scss/vvitu/_vvitu-theme.scss` — the colour tokens
   - `app/layout.jsx` — metadata, and `public/og-image.png` + favicons
9. **Deploy to Vercel**, setting the same environment variables in project settings.

Both long-running uploads carry `maxDuration = 30`; Vercel rejects request bodies over
~4.5 MB at the edge, which is why the upload guard sits at 4 MB.

---

## 10. Known rough edges

Things that are wrong or stale in the repo today — don't be misled by them, and fix them
if you're replicating:

- **`components/vvitu/certifications.jsx` is orphaned.** It isn't imported by
  `index.jsx` or anything else, and its logo paths (`/assets/images/brand/*.png`) point
  at a directory that doesn't exist. It's dead code with placeholder content. It was
  carried over from SRKR rather than deleted, so the two trees stay diffable.
- **The content listed in §0 is still SRKR's.** That is the biggest live issue in this
  repo.
- **No tests, no CI, no pre-commit hooks.** Nothing catches a regression but you.
- The `components/vvitu/dashboard/` folder is a leftover boundary from before the
  `/dashboard` → `/admin` move. Admin components under `components/vvitu/admin/` still
  import shared pieces from it (`login-gate`, `dashboard-kpis`, `recent-table`), and the
  whole coding-profiles module still lives at `dashboard/coding/`. It works; just don't
  expect the folder names to match the routes.
