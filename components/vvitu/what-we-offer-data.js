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
// web-sized webp derivatives — 27 frames, 1.6MB for the whole section, built
// at 1280px wide / quality 74. The raw drop folder they came from
// (public/assets/images/vvitu/WhatweOffer/) is git-ignored: it is 172MB,
// 162MB of which is thirteen 6000x4000 certification originals, and git keeps
// every blob forever. Rebuild the derivatives; never commit an original.
//
// ── Three frames are cropped, and the crop is load-bearing ───────────────
// `street-1` carried a TORII + NAGARJUNA COLLEGE lockup across its top edge —
// another college's name on a VVITU page. `owl-overview` and
// `owl-contests-clean` are product captures whose nav bar carried a TECHNICAL
// HUB mark AND a real account holder's name. In all three cases the offending
// band is a clean horizontal strip at the top, so 13.5–14% off the top
// removes it whole rather than slicing it. Re-crop from the raw folder if you
// ever regenerate these — a straight resize puts the branding back.
//
// TODO(VVITU): the photography is Torii's from other campuses. It is honest
// about what the programme looks like, but none of it is VVITU's own yet.
// Replacing any frame is a file swap at the same path — no code change.
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
// ── `gallery`, not `media` (2026-11-04) ──────────────────────────────────
// Each stop carries an ARRAY of frames, because the photography is uneven by
// nature: Project Space has a season's worth, Startup Chamber has exactly one.
// The stage reads the array length and adapts — a lone frame renders as a
// plain hero with no deck and no counter, so a single-image stop never looks
// like a carousel that failed to load.
//
// `fit: 'contain'` marks a product screenshot rather than a photograph. Those
// are 2.1–2.5:1 (desktop captures) or 0.48:1 (a phone), and cover-cropping
// either one cuts off the very UI that makes the point, so they letterbox
// inside the frame instead. Photographs cover-fill.
//
// `kicker` is the one-line promise; `body` is what actually happens. The
// caption shows both, so neither has to carry the whole weight.
// =========================================================================
export const OFFER_ROADMAP = [
    {
        key: 'week',
        label: 'Project Week',
        kicker: 'Ideas, pitched out loud',
        body: 'A full week of class given over to ideas. Every student brings a problem worth solving and makes the case for it in front of the room — what the problem is, who has it, and how they intend to solve it.',
        gallery: [
            { src: `${IMG}/week-1.webp`, alt: 'Students sketching a project idea on chart paper during Project Week' },
            { src: `${IMG}/week-2.webp`, alt: 'Two students drawing out their problem statement on a poster' },
            { src: `${IMG}/week-3.webp`, alt: 'A classroom of teams working up their ideas on chart paper' },
            { src: `${IMG}/week-4.webp`, alt: 'A mentor taking questions from students at their laptops' },
            { src: `${IMG}/week-5.webp`, alt: 'Two students refining a pitch together on a laptop' }
        ],
        tracked: true
    },
    {
        key: 'space',
        label: 'Project Space',
        kicker: 'Teams build the thing',
        body: 'The ideas that survived become teams. Each team takes a problem statement and builds a working solution on the technology they have been learning, then presents it to every other team. The strongest work is awarded.',
        gallery: [
            { src: `${IMG}/space-1.webp`, alt: 'The full Project Space cohort assembled in the stadium stands' },
            { src: `${IMG}/space-2.webp`, alt: 'A mentor addressing the Project Space cohort in the stadium' },
            { src: `${IMG}/space-3.webp`, alt: 'Hundreds of students seated for a Project Space session' },
            { src: `${IMG}/space-4.webp`, alt: 'Teams building at their laptops in the Project Space lab' },
            { src: `${IMG}/space-5.webp`, alt: 'An evening Project Space gathering seen from above' }
        ],
        tracked: true
    },
    {
        key: 'street',
        label: 'Project Street',
        kicker: 'The whole university walks past',
        body: 'Finished projects leave the lab. Every team puts its work on a board along the campus street, the university walks the line like an exhibition, and everyone who stops to listen votes on what they have seen.',
        gallery: [
            { src: `${IMG}/street-1.webp`, alt: 'A team standing with their project board at Project Street' },
            { src: `${IMG}/street-2.webp`, alt: 'Students explaining their project board to a mentor' },
            { src: `${IMG}/street-3.webp`, alt: 'A team presenting their work from a laptop beside their board' },
            { src: `${IMG}/street-4.webp`, alt: 'A student presenting to the room during Project Street' },
            { src: `${IMG}/street-5.webp`, alt: 'The exhibition hall filled with teams and their projects' }
        ],
        tracked: true
    },
    {
        key: 'contests',
        label: 'Coding Contests',
        kicker: 'Every week, every month',
        body: 'A weekly contest keeps the habit, and the monthly contest is ranked and scored. Monthly winners are awarded on the same stage as the Project Space winners — the prizes are electronics and gadgets, not certificates.',
        gallery: [
            { src: `${IMG}/contest-1.webp`, alt: 'A hall of students competing under the AI Ready Engineer banner' },
            { src: `${IMG}/contest-2.webp`, alt: 'Students at their laptops during a timed coding contest' }
        ]
    },
    {
        key: 'startup',
        label: 'Startup Chamber',
        kicker: 'From idea to venture',
        body: 'Every student is pushed to find a real problem, build a solution that is genuinely their own, and pitch it in the Startup Chamber. Work that turns out to be original gets taken further with our guidance behind it.',
        gallery: [
            { src: `${IMG}/startup-1.webp`, alt: 'Students pitching a startup idea to mentors around a laptop' }
        ]
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
        // The Learning Path capture: graded modules, each with its own
        // progress. It carries the "graded library" claim far better than the
        // contest list that stood in here before.
        //
        // CROPPED ON TWO EDGES, and both are load-bearing. The top 232px held
        // a TECHNICAL HUB mark and an account button; the left 575px held the
        // profile card, which repeats that account holder's name two thirds of
        // the way down where no top crop reaches it. The crop also takes the
        // "NAGPUR FDP 2026" cohort label — another campus's programme name on
        // a VVITU page. Re-crop from the raw file if this is ever regenerated;
        // a straight resize puts all three back.
        gallery: [
            { src: `${IMG}/owl-learning.webp`, fit: 'contain', alt: 'The Owl Coder learning path, with graded modules and per-module progress' }
        ]
    },
    {
        key: 'myna',
        label: 'Myna',
        kicker: 'The rounds that are not technical',
        body: 'Web and mobile practice for listening, speaking, reading and writing, with mock tests and a leaderboard — built to get you through the first interview before the code ever comes up.',
        // The web capture already shows the product on a laptop AND a phone in
        // one frame, so the separate 0.48:1 phone screenshot that used to sit
        // beside it was saying the same thing twice — and at that ratio it
        // letterboxed into a sliver with most of the frame empty either side.
        gallery: [
            { src: `${IMG}/myna-web.webp`, fit: 'contain', alt: 'The Myna platform shown on laptop and mobile' }
        ]
    },
    // MOVED 2026-11-04, from fifth to here. "One number, every platform" is a
    // claim about Owl Coder and Myna, so it only reads as a payoff once both
    // have been introduced; sitting above them it was describing an
    // aggregation of two things the reader had not met yet.
    {
        key: 'profiles',
        label: 'Profiles Connected',
        kicker: 'One number, every platform',
        body: 'LeetCode, CodeChef, HackerRank, GeeksforGeeks, GitHub and LinkedIn all feed the Owl Coder dashboard, so everything you solve anywhere adds up in one place instead of scattering across six logins.',
        gallery: [
            { src: `${IMG}/owl-overview.webp`, fit: 'contain', alt: 'The Owl Coder coding overview totalling solved counts across LeetCode, CodeChef and HackerRank' }
        ],
        platforms: true
    },
    {
        key: 'goldenday',
        label: 'Golden Day',
        kicker: 'How the programme ends',
        body: 'The programme closes with a ceremony. Everyone who got to the top of something — a track, the contests, the Startup Chamber — is recognised in front of the room, with certifications and awards.',
        // THE ONLY STOP WITH ITS OWN FRAME RATIO, and it earns it. These three
        // are not photographs — they are composed Golden Day cards, each with
        // a gold headline, a subtitle and either one image or a 2x2 award
        // grid, on the programme's own navy. Cropping one to the section's
        // 16:9 would take the headline off the top, so the frame matches the
        // card (8:7) instead and the whole thing is shown.
        //
        // A fourth card exists in the raw folder and is deliberately NOT here:
        // goldenday3 (the AI Show one) has a Maya AI panel with a phone number
        // and support@technicalhub.io legible inside it. Unlike the other
        // crops in this file, the offending region is one quadrant of a 2x2
        // grid rather than a strip along an edge, so there is no crop that
        // removes it and leaves a card. Replace it with a version that does
        // not show that panel and it can go straight back in this array.
        ratio: '8 / 7',
        gallery: [
            { src: `${IMG}/golden-1.webp`, alt: 'The Golden Day ceremony, with the whole cohort filling the stadium' },
            { src: `${IMG}/golden-2.webp`, alt: 'Golden Day award winners: Emerging Tech, Best Developer and Star of the Year' },
            { src: `${IMG}/golden-3.webp`, alt: 'Golden Day award winners: Trainee of the Year, Coder of the Year and Best Intern' }
        ],
        finale: true
    }
];
