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
// web-sized webp derivatives — 25 frames plus 6 platform logos, 1.6MB for the
// whole section, built at 1280px wide / quality 74. The raw drop folder they
// came from (public/assets/images/vvitu/WhatweOffer/) is git-ignored: it is
// 178MB, most of it thirteen 6000x4000 certification originals, and git keeps
// every blob forever. Rebuild the derivatives; never commit an original.
//
// ── FIVE frames are edited, and every edit is load-bearing ───────────────
// None of these survives a straight resize. Re-apply them from the raw file
// if a frame is ever regenerated — the per-stop comments below carry the
// exact boxes.
//
// Cropped, because the offending mark is a clean strip along one edge:
//   street-1      a TORII + NAGARJUNA COLLEGE lockup across the top
//   owl-overview  a TECHNICAL HUB mark and a real account holder's name
//   space-1       "EXCLUSIVE FOR ADITYA ENGINEERING COLLEGES" down the left
//
// Painted, because the mark sits in the middle of something worth keeping:
//   owl-product   the same account holder's name, on a green button inside
//                 an embedded screenshot. Filled with the button's own green.
//   myna-product  the slide EDITOR's "Present" bar, on flat cream.
//
// The two product slides are also cut short at the bottom, where the editor's
// chrome sits. That chrome is not part of either slide.
//
// THE RULE THESE FOLLOW: another institution's name, and any real person's
// name, comes off a VVITU page. A product's own attribution of itself stays —
// "A product of Technical Hub" on the Owl Coder slide is deliberate, and not
// the same thing as a stray nav-bar mark.
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
// `kicker` is the one-line promise; `body` is what actually happens. The
// caption shows both, so neither has to carry the whole weight.
//
// ── `ratio`, and why nothing here is ever cropped or letterboxed ─────────
// The deck draws every frame at the stop's OWN shape, so a stop declares the
// shape of its gallery and the stage matches it. Omit it and the stop gets
// 16/9, which is not a default so much as a measurement: all twenty-one
// photographic frames are exactly 1280x720. The four that are not are
// artefacts rather than moments, and each names its own:
//
//   owl-product    1280x645  1.98:1   a designed product slide
//   myna-product   1280x668  1.92:1   a designed product slide
//   owl-overview   1280x515  2.49:1   a product capture
//   golden-*        800x700  1.14:1   designed award cards, not photographs
//
// Forcing any of those into a common frame means cropping the UI that makes
// the point, or bars down both sides. Matching the frame to the file costs one
// line and removes the question.
//
// ── `cap`, and why the pictures are deliberately not shown large ─────────
// A stop may cap how wide its picture is ever drawn. This is the one thing the
// previous full-screen build got wrong and it is worth stating plainly: these
// are 1280px-wide documentary frames, and a 1280px source painted 1900px wide
// is a 1.5x upscale before the display's own pixel ratio doubles it again.
// That is precisely the magnification at which webp softness becomes the
// subject. The default cap is 760px (1.68x headroom on a 1x screen). The
// Golden Day cards are only 800px wide, so they cap lower — see that stop.
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
        // REORDERED 2026-11-06 around three new frames. The set now follows the
        // copy beside it — teams build, then present, then the strongest work is
        // awarded — instead of leading with crowd shots. Three assembly frames
        // came out (a stadium address, a seated cohort, an evening gathering):
        // they showed the scale of Project Space, not the building of anything,
        // and this stop is about the building. All three are still in the raw
        // folder if the scale shots are ever wanted back.
        //
        // `space-1` is cropped: its left 30% carried "EXCLUSIVE FOR ADITYA
        // ENGINEERING COLLEGES" on the hall screen — another college's name on
        // a VVITU page. The crop keeps the Project Space badge on the same
        // screen. Re-crop from the raw file if this is ever regenerated.
        gallery: [
            { src: `${IMG}/space-1.webp`, alt: 'A hall of students building at their laptops during Project Space' },
            { src: `${IMG}/space-2.webp`, alt: 'A mentor working through a problem with a team at their laptops' },
            { src: `${IMG}/space-3.webp`, alt: 'Project Space winners on stage with their awards' },
            { src: `${IMG}/space-4.webp`, alt: 'Teams building at their laptops in the Project Space lab' },
            { src: `${IMG}/space-5.webp`, alt: 'The full Project Space cohort assembled for the opening' }
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
        ratio: '1280 / 645',
        label: 'Owl Coder',
        kicker: 'Ten years of interview questions',
        body: 'DSA, SQL and core coding in one graded library built for placement readiness, with your progress tracked across every platform you are on.',
        // REPLACED 2026-11-06 with Torii's own product slide, which replaces
        // the raw Learning Path capture that stood here. A designed slide
        // states the claim (3,389 practice questions, 1,500 company questions)
        // instead of leaving a reader to infer it from a screenshot, and it
        // needs none of the defensive cropping that capture did.
        //
        // TWO EDITS TO THE SOURCE, both load-bearing:
        //
        //  1. The embedded nav bar carried a green account button reading a
        //     REAL account holder's name — the same person already cropped out
        //     of owl-overview. The button's green is uniform (38,152,57), so
        //     its interior is painted flat and it reads as an unlabelled
        //     button. Insetting 2px keeps the rounded corners.
        //  2. The bottom 97px was the slide EDITOR's chrome — a slide-tab pill
        //     and a "Present" bar, neither of which is part of the slide. The
        //     monitor and its shadow end at y=783 and the chrome starts at
        //     y=794, so cutting at 790 takes one and keeps the other.
        //
        // Rebuild from 'owlcoder new.png' in the raw folder; a straight resize
        // puts the name and the editor chrome back.
        //
        // "A product of Technical Hub" is kept deliberately. Unlike the nav-bar
        // marks cropped elsewhere in this file, that is the slide's own
        // attribution of its own product, placed there on purpose.
        gallery: [
            { src: `${IMG}/owl-product.webp`, alt: 'Owl Coder: practise, compete and track your coding across one platform, with 3,389 practice questions and 1,500 company questions' }
        ]
    },
    {
        key: 'myna',
        ratio: '1280 / 668',
        label: 'Myna',
        kicker: 'The rounds that are not technical',
        body: 'Web and mobile practice for listening, speaking, reading and writing, with mock tests and a leaderboard — built to get you through the first interview before the code ever comes up.',
        // REPLACED 2026-11-06, same reasoning as Owl Coder above: Torii's own
        // product slide rather than a raw capture. This one also happens to be
        // the only frame in the section already drawn in the site's own coral
        // palette, so it sits in the deck as if it belonged there.
        //
        // ONE EDIT TO THE SOURCE, and it is gentler than Owl Coder's. The
        // editor's "Present" pill sits on flat cream (251,248,246) with nothing
        // else near it, so it is painted out rather than cropped — which keeps
        // the stats row, whose labels end only 6px above where the pill starts
        // and would have been shaved by any horizontal cut. The bottom 47px
        // still goes, because "SCROLL TO ENTER THE APP" is an instruction for
        // the deck, not for this page.
        //
        // Rebuild from 'mynanew.png' in the raw folder.
        gallery: [
            { src: `${IMG}/myna-product.webp`, alt: 'Myna, an AI-powered English companion for placements, shown on web and mobile' }
        ]
    },
    // MOVED 2026-11-04, from fifth to here. "One number, every platform" is a
    // claim about Owl Coder and Myna, so it only reads as a payoff once both
    // have been introduced; sitting above them it was describing an
    // aggregation of two things the reader had not met yet.
    {
        key: 'profiles',
        ratio: '1280 / 515',
        label: 'Profiles Connected',
        kicker: 'One number, every platform',
        body: 'LeetCode, CodeChef, HackerRank, GeeksforGeeks, GitHub and LinkedIn all feed the Owl Coder dashboard, so everything you solve anywhere adds up in one place instead of scattering across six logins.',
        gallery: [
            { src: `${IMG}/owl-overview.webp`, alt: 'The Owl Coder coding overview totalling solved counts across LeetCode, CodeChef and HackerRank' }
        ],
        platforms: true
    },
    {
        key: 'goldenday',
        label: 'Golden Day',
        kicker: 'How the programme ends',
        body: 'The programme closes with a ceremony. Everyone who got to the top of something — a track, the contests, the Startup Chamber — is recognised in front of the room, with certifications and awards.',
        // These three are not photographs — they are composed Golden Day cards,
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
        // These three are only 800px wide, where every other frame in the
        // section is 1280. Drawn at the shared 760px cap they would be at
        // 1.05x — no headroom at all on any modern display. 560 keeps them at
        // 1.43x, which is where they stop looking soft.
        cap: '560px',
        gallery: [
            { src: `${IMG}/golden-1.webp`, alt: 'The Golden Day ceremony, with the whole cohort filling the stadium' },
            { src: `${IMG}/golden-2.webp`, alt: 'Golden Day award winners: Emerging Tech, Best Developer and Star of the Year' },
            { src: `${IMG}/golden-3.webp`, alt: 'Golden Day award winners: Trainee of the Year, Coder of the Year and Best Intern' }
        ],
        finale: true
    }
];
