// =========================================================================
// AI Ready Engineers — selection results: shared definitions
// =========================================================================
//
// PURE module, safe on both sides (§8.7). The admin page imports it for its
// labels and its paste-box parsing; the API routes import it to validate what
// the page sends. Keeping one copy is what stops the two from disagreeing about
// which rounds exist or what a roll number looks like.
//
// ── Where results live ──────────────────────────────────────────────────────
// On the student's own `vvitu_hostel_roster` document, namespaced by academic
// year:
//
//   results: {
//     '2026-27': {
//       rounds:    { 'demo-test': { at }, 'round-1': { at }, … },
//       interview: { coding: 1-5, communication: 1-5, scoredAt }
//     }
//   }
//
// Keyed by year rather than flat because the same student (same roll number,
// same roster document) comes back next year as a 3rd year: a flat `rounds`
// would carry 2026-27's shortlist into 2027-28's selection.
//
// A round entry's PRESENCE is the fact ("this student is on that round's list");
// `at` is only when it was recorded. Absence means "not on the list", never
// "failed" — a student missing from Round 2 may simply not have been uploaded yet.

/**
 * The selection stages a list can be uploaded for, in order. `stepId` is the id
 * of the matching card in components/vvitu/selection-process-data.js; orientation
 * and registration are not here because nobody is shortlisted at either.
 *
 * `listOf` says what being on the list MEANS, and the page shows it next to the
 * upload so the person uploading knows which spreadsheet the college should send.
 */
export const SELECTION_ROUNDS = [
    {
        key: 'demo-test',
        stepId: 'demo-test',
        label: 'Demo Test',
        short: 'Demo',
        listOf: 'Students who took the demo test'
    },
    {
        key: 'round-1',
        stepId: 'round-1',
        label: 'Round 1 — Online Coding Assessment',
        short: 'Round 1',
        listOf: 'Students who wrote the online coding assessment'
    },
    {
        key: 'round-2',
        stepId: 'round-2',
        label: 'Round 2 — Offline Coding Assessment',
        short: 'Round 2',
        listOf: 'Round 1 shortlisted students, qualified for the offline assessment'
    },
    {
        key: 'round-3',
        stepId: 'round-3',
        label: 'Round 3 — Communication Assessment',
        short: 'Round 3',
        listOf: 'Round 2 shortlisted students, qualified for the communication assessment'
    },
    {
        key: 'interview',
        stepId: 'interviews',
        label: 'One-on-One Interview',
        short: 'Interview',
        listOf: 'Students qualified for the one-on-one interview — these are the students scored below'
    },
    {
        key: 'final',
        stepId: 'announcement',
        label: 'Final Shortlist',
        short: 'Final',
        listOf: 'Students selected for the AI Ready Engineers programme'
    }
];

/** The round whose list decides who can be scored in the interview panel. */
export const INTERVIEW_ROUND = 'interview';

export const ROUND_KEYS = SELECTION_ROUNDS.map((r) => r.key);

export const roundByKey = (key) => SELECTION_ROUNDS.find((r) => r.key === key) || null;

/** The round before `key`, or null for the first. Used for the "not on the
 *  previous list" check — a warning, never a block (see the store). */
export function previousRound(key) {
    const i = ROUND_KEYS.indexOf(key);
    return i > 0 ? SELECTION_ROUNDS[i - 1] : null;
}

// Star ratings. Integers only — half stars would need a second UI and nobody
// asked for one.
export const MAX_STARS = 5;
export const SCORE_FIELDS = [
    { key: 'coding', label: 'Coding' },
    { key: 'communication', label: 'Communication' }
];

export const isValidScore = (v) => Number.isInteger(v) && v >= 1 && v <= MAX_STARS;

/**
 * Free-text remarks the panel may add beside the stars — "strong fundamentals",
 * "suspected cheating", whatever the stars cannot say on their own.
 *
 * OPTIONAL by design: the two star fields stay required, and a blank remark is a
 * blank remark, never a reason to refuse a save. An empty string clears a remark
 * that was written earlier, so a mistake can be taken back as easily as it was
 * typed.
 *
 * The cap is generous enough for a paragraph and small enough that the route's
 * body limit still rejects anything pathological before it is parsed.
 */
export const MAX_REMARKS = 1000;

/** Trim, collapse the line endings a paste from Word brings in, and cap. */
export function normaliseRemarks(v) {
    if (v === undefined || v === null) return '';
    return String(v).replace(/\r\n?/g, '\n').trim().slice(0, MAX_REMARKS);
}

/** Anything that survives normalisation is valid; only over-length raw input is not. */
export const isValidRemarks = (v) =>
    v === undefined || v === null || (typeof v === 'string' && String(v).trim().length <= MAX_REMARKS);

/**
 * "2026-27". The year is interpolated into a MongoDB field path
 * (`results.<year>.rounds…`), so it is validated against this exact shape before
 * it gets anywhere near a query — a year containing `.` or `$` would address a
 * different field entirely.
 */
export const isValidYear = (v) => typeof v === 'string' && /^\d{4}-\d{2}$/.test(v);

/** Same normalisation as scripts/seed-hostel-roster.mjs — it MUST match, it is how
 *  an uploaded roll number finds its roster document (`rollKey`). */
export const normaliseRoll = (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Does this token look like a roll number? VVITU's are 14 characters of mixed
 * letters and digits (e.g. four-digit year, branch letters, serial). The test is
 * deliberately looser than that — 8 to 16 characters, at least one letter and one
 * digit — so a lateral-entry or differently-formatted roll still reaches the
 * roster check and is reported as "not found" rather than silently dropped. What
 * it does throw away is the noise a pasted column always carries: the "Roll No"
 * header, names, serial numbers and phone numbers (digits only).
 */
export function looksLikeRoll(key) {
    return key.length >= 8 && key.length <= 16 && /[A-Z]/.test(key) && /\d/.test(key);
}

/**
 * Turn whatever was pasted — one per line, comma-separated, a column copied out
 * of Excel with its header — into normalised roll keys.
 *
 * Returns { keys, ignored, duplicates }: `keys` unique and in first-seen order,
 * `ignored` the tokens that did not look like a roll number (shown to the admin,
 * so nothing vanishes unexplained), `duplicates` how many repeats were folded.
 */
export function parseRollTokens(tokens) {
    const seen = new Set();
    const keys = [];
    const ignored = [];
    let duplicates = 0;
    for (const raw of tokens) {
        const text = String(raw ?? '').trim();
        if (!text) continue;
        const key = normaliseRoll(text);
        if (!looksLikeRoll(key)) {
            ignored.push(text);
            continue;
        }
        if (seen.has(key)) {
            duplicates++;
            continue;
        }
        seen.add(key);
        keys.push(key);
    }
    return { keys, ignored, duplicates };
}

/** Split pasted text on whitespace, commas, semicolons and tabs. A roll number
 *  never contains any of those, so this cannot cut one in half. */
export const splitPasted = (text) => String(text ?? '').split(/[\s,;]+/);

// Upload modes. REPLACE makes the uploaded file THE list for that round (anyone
// previously on it but absent now is taken off), which is what a corrected list
// from the college means. ADD only ever adds — for a list that arrives in parts.
export const UPLOAD_MODES = ['replace', 'add'];
