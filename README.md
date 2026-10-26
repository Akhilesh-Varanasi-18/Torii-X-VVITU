# VVITU × ToriiMinds

The public landing page for the **ToriiMinds × Vasireddy Venkatadri International
Technological University** collaboration, plus the internal admin panel that runs it.

This repo is a replica of the SRKR × ToriiMinds project. **[`CLAUDE.md`](./CLAUDE.md) is
the real documentation** — it covers the stack, the registration and coding-profiles
subsystems, the data model, and the house rules that are easy to break by accident. Read
§0 there first: it lists what is switched off for this launch and what content is still
SRKR's.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

If the SRKR project is already on 3000, use `npx next dev -p 3100`.

You need a `.env.local` in the repo root (git-ignored):

```bash
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/?retryWrites=true&w=majority
MONGODB_DB=vvitu                       # must NOT be 'srkr'
MONGODB_COLLECTION=vvitu_registrations
DASHBOARD_PASSCODE=<your-secret>
```

No migration step — indexes are created lazily on first access.

## What's live

- `/` — the landing page: Who We Are → Programs → Courses → Selection Process →
  Contact, with the registration, announcement and WhatsApp-community modals layered
  on top.
- `/admin` — the admin panel: Overview, Registrations Analytics, Coding Profiles and
  Announcements. Passcode-gated, `noindex`, and backed by VVITU's **own** Atlas
  cluster, which starts empty — every figure reads zero until registrations arrive.
  `/dashboard*` redirects here.
- All 16 API routes: 4 public (`/api/register`, `/api/register/lookup`,
  `/api/announcements/active`, `/api/announcements/image/[id]`) and 12 under
  `/api/admin/*`, each returning 401 without a valid session cookie.

"Meet Our Team" is still commented out of the landing page.

> The `mongodb+srv://` connection string may fail with `querySrv ECONNREFUSED` on a
> network whose resolver does not serve SRV records. That is DNS, not credentials — use
> the seed-list URI instead. Both are in `.env.local`; see §3 of `CLAUDE.md`.

## Colour system

Every colour lives in `public/assets/scss/vvitu/_vvitu-theme.scss` as a `--vvitu-*`
custom property. **Nothing is hardcoded** — write `var(--vvitu-primary)`, never
`#E2544C`. If you need a colour that doesn't exist, add a token.
`torii-color-palette.html` in the repo root is the reference palette.

## Before this site takes a registration

Search the codebase for `TODO(VVITU)`. The WhatsApp invite links and the B.Tech branch
list are still SRKR's — and a branch VVITU runs that is missing from the list means
students in that branch cannot register at all. CLAUDE.md §0 has the full list, including
the photography and syllabus copy that still needs replacing.
