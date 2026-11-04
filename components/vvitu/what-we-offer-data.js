// =========================================================================
// ToriiMinds x VVITU — "What We Offer" (AI Ready Engineers)
// -------------------------------------------------------------------------
// Everything the programme gives a student that is NOT a module in the
// syllabus. It renders as the closing section of the syllabus view, after
// "Modules & Topics" — the curriculum answers "what will I learn", this
// answers "what will I do, and what do I walk away with".
//
// Four acts, in this order, because the content has two different shapes and
// flattening them into one grid would lose the half that has a story in it:
//
//   1. THE PROJECT JOURNEY  — a sequence. Week -> Space -> Street, in order.
//   2. BEYOND THE CLASSROOM — parallel offerings. No order, so a grid.
//   3. YOUR TOOLKIT         — the two platforms the student gets logins to.
//   4. GOLDEN DAY           — the finale every other act feeds into.
//
// ── Why the journey has a TRACK TOGGLE rather than six blocks ────────────
// The three stages run TWICE: once on the student's technology track, once on
// AI. The stages themselves are identical; only the cohort, the photographs
// and the AI assistance differ. Writing them out twice would produce six
// near-identical blocks and bury the one interesting fact — that it is the
// same journey, run in parallel. A toggle states that in a single gesture,
// re-tints the section to each track's own colour, and halves the height.
//
// ── Images ───────────────────────────────────────────────────────────────
// All referenced files live in /assets/images/vvitu/offer/ and are curated,
// web-sized webp derivatives (~1MB for the whole section). The raw drop
// folder they were built from is git-ignored: it is 169MB, 162MB of which is
// thirteen 6000x4000 certification originals, and git keeps every blob
// forever. Rebuild the derivatives rather than committing originals.
//
// TODO(VVITU): three photographs are stand-ins. VVITU has not yet shot the
// orange-tee AI sessions, so `week-ai`, `space-ai` and `street-ai` currently
// show technology-track frames (different frames from the tech track, so the
// toggle visibly changes). Replacing them is a file swap at the same paths —
// no code change. Same for `golden-day`, which stands in with a certificate
// ceremony until the Golden Day photographs exist.
// =========================================================================

const IMG = '/assets/images/vvitu/offer';

// The two parallel runs of the project journey. `accent` drives the section's
// colour scheme via a data attribute, so switching track re-tints everything
// in one transition instead of per-element class swaps.
export const OFFER_TRACKS = [
    {
        key: 'tech',
        label: 'Technology',
        short: 'Tech',
        note: 'Run on the stack you are learning — your own problem, your own build, start to finish.'
    },
    {
        key: 'ai',
        label: 'AI',
        short: 'AI',
        note: 'The same three stages, run again on AI — with Anthropic and OpenAI access, and an AI mentor alongside every team.'
    }
];

// The sequence. `no` is shown as a large numeral because the order is the
// point: you cannot exhibit a project you have not built, and you cannot build
// one you have not pitched.
// REMOVED 2026-11-04: OFFER_JOURNEY, OFFER_BEYOND and OFFER_FINALE. They fed
// the four-act card layout the roadmap replaced, and nothing imported them any
// more. Two near-identical sets of the same copy in one file is how an edit
// meant for the roadmap landed on the dead copy instead. All of it is in git
// history.

export const OFFER_PLATFORMS = [
    { key: 'leetcode', name: 'LeetCode', src: `${IMG}/logos/leetcode.webp` },
    { key: 'codechef', name: 'CodeChef', src: `${IMG}/logos/codechef.webp` },
    { key: 'hackerrank', name: 'HackerRank', src: `${IMG}/logos/hackerrank.webp` },
    { key: 'gfg', name: 'GeeksforGeeks', src: `${IMG}/logos/gfg.webp` },
    { key: 'github', name: 'GitHub', src: `${IMG}/logos/github.webp` },
    { key: 'linkedin', name: 'LinkedIn', src: `${IMG}/logos/linkedin.webp` }
];

// Parallel offerings — no sequence, so a grid. `span` lets the two with the
// strongest imagery take the full row on desktop.
// =========================================================================
// THE ROADMAP
// -------------------------------------------------------------------------
// Every stop the programme takes a student through, in order, as one
// continuous Z-shaped path: rows run left→right, turn down at the end, then
// run right→left, and so on. The path fills as the section is scrolled and
// each stop lights up as the line reaches it.
//
// ── Why one path instead of four separate acts ──────────────────────────
// Read as cards, these ten things are a list of perks. Read as a path, they
// are a year: you pitch an idea, you build it, you exhibit it, you compete,
// you are certified, and it ends with your name being read out. The order is
// the argument, and a roadmap is the only layout that makes the order the
// first thing a reader sees.
//
// `media` is either a single image or, for the three stages that run twice,
// a { tech, ai } pair that follows the track toggle.
//
// `kicker` is the one-line promise; `body` is what actually happens. The
// spotlight shows both, so neither has to carry the whole weight.
// =========================================================================
export const OFFER_ROADMAP = [
    {
        key: 'week',
        label: 'Project Week',
        kicker: 'Ideas, pitched out loud',
        body: 'A full week of class given over to ideas. Every student brings a problem worth solving and makes the case for it in front of the room — what the problem is, who has it, and how they intend to solve it.',
        media: { tech: `${IMG}/week-tech.webp`, ai: `${IMG}/week-ai.webp` },
        alt: 'Students mapping out a project idea on chart paper during Project Week',
        tracked: true
    },
    {
        key: 'space',
        label: 'Project Space',
        kicker: 'Teams build the thing',
        body: 'The ideas that survived become teams. Each team takes a problem statement and builds a working solution on the technology they have been learning, then presents it to every other team. The strongest work is awarded.',
        media: { tech: `${IMG}/space-tech.webp`, ai: `${IMG}/space-ai.webp` },
        alt: 'A mentor reviewing a team’s work in the lab during Project Space',
        tracked: true
    },
    {
        key: 'street',
        label: 'Project Street',
        kicker: 'The whole university walks past',
        body: 'Finished projects leave the lab. Every team puts its work on a board along the campus street, the university walks the line like an exhibition, and everyone who stops to listen votes on what they have seen.',
        media: { tech: `${IMG}/street-tech.webp`, ai: `${IMG}/street-ai.webp` },
        alt: 'Students presenting their project on a board to visitors at Project Street',
        tracked: true
    },
    {
        key: 'contests',
        label: 'Coding Contests',
        kicker: 'Every week, every month',
        body: 'A weekly contest keeps the habit, and the monthly contest is ranked and scored. Monthly winners are awarded on the same stage as the Project Space winners — the prizes are electronics and gadgets, not certificates.',
        media: `${IMG}/coding-room.webp`,
        alt: 'A hall of students competing in an AI Ready Engineer coding contest'
    },
    {
        key: 'profiles',
        label: 'Profiles Connected',
        kicker: 'One number, every platform',
        body: 'LeetCode, CodeChef, HackerRank, GeeksforGeeks, GitHub and LinkedIn all feed the Owl Coder dashboard, so everything you solve anywhere adds up in one place instead of scattering across six logins.',
        media: `${IMG}/owl-contests.webp`,
        alt: 'The Owl Coder contest list showing weekly and monthly coding contests',
        platforms: true,
        shot: true
    },
    {
        key: 'startup',
        label: 'Startup Chamber',
        kicker: 'From idea to venture',
        body: 'Every student is pushed to find a real problem, build a solution that is genuinely their own, and pitch it in the Startup Chamber. Work that turns out to be original gets taken further with our guidance behind it.',
        media: `${IMG}/startup.webp`,
        alt: 'Students discussing a startup idea around a laptop'
    },
    // REMOVED 2026-11-04 at VVITU's request: Global Certifications is no
    // longer a milestone. Its copy is in git history and
    // offer/certifications.webp is still in the image set, so restoring it
    // needs no rebuild — just paste the entry back here.
    {
        key: 'owlcoder',
        label: 'Owl Coder',
        kicker: 'Ten years of interview questions',
        body: 'DSA, SQL and core coding in one graded library built for placement readiness, with your progress tracked across every platform you are on.',
        media: `${IMG}/owl-dashboard.webp`,
        alt: 'The Owl Coder dashboard showing solved counts across LeetCode, CodeChef and HackerRank',
        shot: true
    },
    {
        key: 'myna',
        label: 'Myna',
        kicker: 'The rounds that are not technical',
        body: 'Web and mobile practice for listening, speaking, reading and writing, with mock tests and a leaderboard — built to get you through the first interview before the code ever comes up.',
        media: `${IMG}/myna-web.webp`,
        alt: 'The Myna platform shown on laptop and mobile',
        shot: true
    },
    {
        key: 'goldenday',
        label: 'Golden Day',
        kicker: 'How the programme ends',
        body: 'The programme closes with a ceremony. Everyone who got to the top of something — a track, the contests, the Startup Chamber — is recognised in front of the room, with certifications and awards.',
        media: `${IMG}/golden-day.webp`,
        alt: 'Students raising their certificates at the closing ceremony',
        finale: true
    }
];
