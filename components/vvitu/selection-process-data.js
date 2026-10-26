// =========================================================================
// ToriiMinds x VVITU — AI Ready Engineers selection process
// =========================================================================
//
// The eight stages a student passes through, in order. Deliberately NO dates,
// venues or time windows anywhere in this file: none of them are confirmed yet,
// and a stale date on a public page is worse than no date at all. Each stage
// that depends on a schedule says how the schedule will reach the student
// instead (`channels`), which is information that stays true.
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
        summary:
            'Registration opens for AI Ready Engineers — 2nd year, 2029 passouts. You submit your branch, your CGPA (or diploma CGPA, if you joined through lateral entry), your active backlogs and, optionally, your entrance ranks.',
        note: 'The registration closing date is announced ahead of time — watch the website announcements and the WhatsApp community.',
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
        badges: [{ label: 'Mode', value: 'Offline or Online · to be confirmed' }],
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
