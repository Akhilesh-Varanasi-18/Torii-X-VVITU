// =========================================================================
// ToriiMinds x VVITU — AI Ready Engineers selection process
// =========================================================================
//
// The eight stages a student passes through, in order. The schedule was
// confirmed on 2026-11-12 and each dated stage carries it as its FIRST badge
// (`Date`; registration leads with its closed `Status`, then `Closed on`), so
// it reads before mode/duration.
// Orientation has no confirmed date and so shows none — a guessed date on a
// public page is worse than no date at all. Venues and time windows are still
// unannounced; `channels` says how those will reach the student.
//
// Dates are written as text ("Tue, 17 Nov 2026"), never as Date objects: they
// are calendar days in Guntur, and rendering them through the browser's
// timezone could shift a day for a student whose device clock is set abroad.
//
// `tier` drives the funnel. It counts how many shortlisting gates the student
// has already passed, and the UI uses it to narrow the rail, pull the cards in
// and fade the backdrop — so the page physically narrows as the field does.
// Everything before the first gate is tier 0.
//
// `gate` is the band rendered ABOVE a stage: who is still in the running by the
// time they reach it. Only the three stages that follow a shortlisting carry one.
//
// A field left out is a field not shown. `duration` is absent wherever the
// length genuinely isn't decided (orientation, interviews) rather than being
// filled with a guess.

export const SELECTION_STEPS = [
    {
        id: 'orientation',
        step: '01',
        title: 'Orientation Session',
        kicker: 'Where it starts',
        icon: 'campus',
        tier: 0,
        badges: [{ label: 'Mode', value: 'In Campus' }],
        summary:
            'The programme opens with an on-campus orientation — what the AI Ready track covers, how the selection process works, and what to expect at every stage that follows.'
    },
    {
        id: 'registration',
        step: '02',
        title: 'Registration',
        kicker: 'AI Ready Engineers',
        icon: 'form',
        tier: 0,
        // Closed 2026-11-15. The date stays on the card — it is still the true
        // record of when the window shut — and a `Status` badge in the danger
        // tone (`tone: 'closed'`) leads the row so the state reads first.
        badges: [
            { label: 'Status', value: 'Closed', tone: 'closed' },
            { label: 'Closed on', value: 'Sun, 15 Nov 2026' }
        ],
        summary:
            'Registration for AI Ready Engineers — 2nd year, 2029 passouts — is now closed. Students submitted their branch, their CGPA (or diploma CGPA, if they joined through lateral entry), their active backlogs and, optionally, their entrance ranks.',
        note: 'Registrations closed on Sunday, 15 November 2026. If you registered before the deadline, there is nothing more to do — updates are posted on the website announcements and the WhatsApp community.',
        channels: ['Website Announcements', 'WhatsApp Community']
    },
    {
        id: 'demo-test',
        step: '03',
        title: 'Demo Test',
        kicker: 'Practice run',
        icon: 'monitor',
        tier: 0,
        badges: [
            { label: 'Date', value: 'Mon, 16 Nov 2026' },
            { label: 'Mode', value: 'Online' },
            { label: 'Access', value: '24-hour window' }
        ],
        summary:
            'A practice run on the exam platform before Round 1 counts for anything. You get a 24-hour access window and can attempt it from anywhere inside that time.',
        note: 'Login access is shared only with students who completed their registration before the deadline.',
        channels: ['Email', 'WhatsApp Community', 'Website Announcements']
    },
    {
        id: 'round-1',
        step: '04',
        title: 'Round 1 — Online Coding Assessment',
        kicker: 'First assessment',
        icon: 'code',
        tier: 0,
        accent: true,
        badges: [
            { label: 'Date', value: 'Tue, 17 Nov 2026' },
            { label: 'Mode', value: 'Online' },
            { label: 'Duration', value: '1 Hour' },
            { label: 'Pattern', value: '3 Coding Questions' }
        ],
        summary: 'Three coding questions drawn from four topics.',
        chipsLabel: 'Topics',
        chips: ['Basic Mathematics', 'Conditional Statements', 'Arrays', 'Strings'],
        outcome: 'Students who clear Round 1 are shortlisted for Round 2.'
    },
    {
        id: 'round-2',
        step: '05',
        title: 'Round 2 — Offline Coding Assessment',
        kicker: 'Proctored, on campus',
        icon: 'shield',
        tier: 1,
        accent: true,
        gate: 'Only Round 1 shortlisted students continue',
        badges: [
            { label: 'Date', value: 'Wed, 18 Nov 2026' },
            { label: 'Mode', value: 'Offline · Proctored' },
            { label: 'Duration', value: '1 Hour' },
            { label: 'Pattern', value: '4 Coding Questions' }
        ],
        summary: 'A proctored coding round written in campus — four questions across three topics.',
        chipsLabel: 'Topics',
        chips: ['Loops', 'Strings', 'Arrays']
    },
    {
        id: 'round-3',
        step: '06',
        title: 'Round 3 — Communication Assessment',
        kicker: 'LSRW skills',
        icon: 'mic',
        tier: 2,
        accent: true,
        gate: 'Only Round 2 shortlisted students continue',
        badges: [
            { label: 'Date', value: 'Thu, 19 Nov 2026' },
            { label: 'Mode', value: 'Online · Myna app' },
            { label: 'Duration', value: '20 Minutes' }
        ],
        summary: 'An assessment of your LSRW skills, taken in the Myna application.',
        chipsLabel: 'Assessed on',
        chips: ['Listening', 'Speaking', 'Reading', 'Writing']
    },
    {
        id: 'interviews',
        step: '07',
        title: 'One-on-One Interviews',
        kicker: 'Meet the panel',
        icon: 'chat',
        tier: 3,
        gate: 'Only students shortlisted after the communication assessment continue',
        badges: [
            { label: 'Dates', value: 'Fri, 20 – Tue, 24 Nov 2026' },
            { label: 'Mode', value: 'Offline or Online · to be confirmed' }
        ],
        summary:
            'Shortlisted students sit a one-on-one interview with the ToriiMinds panel.'
    },
    {
        id: 'announcement',
        step: '08',
        title: 'Final Shortlist Announcement',
        kicker: 'The finish line',
        icon: 'trophy',
        tier: 3,
        isFinal: true,
        badges: [{ label: 'Date', value: 'Wed, 25 Nov 2026' }],
        summary: 'The students selected for the AI Ready Engineers programme are announced.',
        note: 'The list reaches you three ways — a mail to your registered address, the list posted in the WhatsApp community, and the announcement on this website.',
        channels: ['Email', 'WhatsApp Community', 'Website Announcement']
    }
];

// How far the funnel closes in by the last tier, as a percentage of the rail's
// width. Read by both the card insets and the backdrop shape so the two can
// never drift apart.
export const FUNNEL_TIERS = 4;

export default SELECTION_STEPS;
