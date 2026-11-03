// Server-only helpers for roster-gated intakes.
//
// AI Ready Engineers is open only to the 2nd-year hostel list the college
// supplied — roughly 1,400 students. That list is both the eligibility check
// AND the pre-fill source: a student finds themselves in it, and the fields the
// college already knows arrive filled in.
//
// ── Why the roster, not the browser, is the source of truth ──────────────
// The browser sends a roll number and nothing else that identifies the student.
// Name and roll are composed HERE, from the roster, so a tampered request
// cannot register one student under another's name, and cannot register at all
// for a roll that is not on the list.
//
// ── What the college gives us, and what it does not ──────────────────────
// The spreadsheet carries roll number, name, programme and gender. It does NOT
// carry email, mobile, laptop or academics — so unlike the SRKR Moon Coder
// intake, which pre-filled everything from a previous registration and asked
// for three things, this one pre-fills what it knows and asks for the rest.
//
// Never import this from a client component: it reaches the database.

import { getHostelRosterCollection, getRegistrationsCollection } from './mongodb';
import { BRANCH_OPTIONS, branchOptionForCode, normalizeRoll, PROGRAM_BY_KEY } from './registration-schema';

// Every student on this roster is a hosteler — it IS the hostel list — so the
// residence answer is already known and is not asked for again.
export const ROSTER_RESIDENCE = 'Hosteler';

// ~1,400 small documents that change only when the college sends a new list.
// A short cache keeps every keystroke of the type-ahead off the database.
const ROSTER_TTL_MS = 2 * 60 * 1000;
let rosterCache = globalThis.__vvituHostelRoster;
if (!rosterCache) rosterCache = globalThis.__vvituHostelRoster = { at: 0, rows: null, promise: null };

const fold = (value) =>
    String(value || '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim();

/** "SAI KUMAR" → "Sai Kumar" for roster names that arrived fully upper-cased. */
const titleCase = (value) =>
    String(value || '')
        .toLowerCase()
        .replace(/(^|[\s.'-])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase())
        .trim();

const displayName = (name) => (name && name === name.toUpperCase() ? titleCase(name) : name || '');

/** The eligibility list, normalised to what the form and the search need. */
export async function eligibleRoster() {
    const now = Date.now();
    if (rosterCache.rows && now - rosterCache.at < ROSTER_TTL_MS) return rosterCache.rows;
    if (!rosterCache.promise) {
        rosterCache.promise = getHostelRosterCollection()
            .then((collection) =>
                collection
                    .find(
                        {},
                        { projection: { _id: 0, rollKey: 1, rollNo: 1, name: 1, program: 1, branchCode: 1, gender: 1 } }
                    )
                    .toArray()
            )
            .then((docs) => {
                rosterCache.rows = docs.map((doc) => ({
                    rollKey: doc.rollKey || normalizeRoll(doc.rollNo),
                    rollNo: doc.rollNo || doc.rollKey || '',
                    name: doc.name || '',
                    program: doc.program || '',
                    branchCode: doc.branchCode || '',
                    gender: doc.gender || ''
                }));
                rosterCache.at = Date.now();
                return rosterCache.rows;
            })
            .finally(() => {
                rosterCache.promise = null;
            });
    }
    return rosterCache.promise;
}

/** The roster entry for a roll number, or null when the student is not listed. */
export async function eligibleEntry(roll) {
    const rollKey = normalizeRoll(roll);
    if (!rollKey) return null;
    const rows = await eligibleRoster();
    return rows.find((row) => row.rollKey === rollKey) || null;
}

/**
 * Type-ahead over the roster. Matches roll-number prefixes first, then names
 * (whole prefix, then every typed word as a word prefix, then anywhere), so
 * typing either a roll number or a name finds the same student — which is what
 * students actually do, half of them not remembering their own roll number.
 *
 * Returns only what the suggestion list shows: roll, name and branch. Never
 * contact details — this endpoint is public, and a list of 1,400 real students
 * must not become a directory anyone can harvest.
 */
export async function searchEligible(query, limit = 8) {
    const q = fold(query);
    if (q.length < 2) return [];
    const rows = await eligibleRoster();
    const qCompact = q.replace(/[^A-Z0-9]/g, '');
    const qWords = q.split(' ').filter(Boolean);

    const scored = [];
    for (const row of rows) {
        const name = fold(row.name);
        const words = name.split(' ');
        let score = 0;
        if (qCompact && row.rollKey.startsWith(qCompact)) score = 100;
        else if (qCompact && row.rollKey.includes(qCompact)) score = 80;
        else if (name.startsWith(q)) score = 70;
        else if (qWords.length && qWords.every((w) => words.some((word) => word.startsWith(w)))) score = 60;
        else if (name.includes(q)) score = 40;
        if (score) scored.push({ score, row });
    }
    scored.sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name));
    return scored.slice(0, limit).map(({ row }) => ({
        rollNo: row.rollNo,
        name: displayName(row.name),
        branch: row.branchCode ? branchOptionForCode(row.branchCode) : '',
        program: row.program
    }));
}

/**
 * Everything the form pre-fills for one listed student.
 *
 * Four fields come from the college's list — name, roll, branch, gender — plus
 * residence, which is known because this IS the hostel roster. Email, mobile,
 * laptop and academics are not in the list and stay for the student to answer.
 *
 * `branch` is left BLANK rather than guessed when the college's programme code
 * has no mapping (CAI, at the time of writing). The branch field is editable,
 * so an unmapped student picks their own — whereas a wrong branch applied
 * silently to a hundred students is not something anyone would catch.
 *
 * Also reports whether this roll already holds a record for the target
 * programme, so the form can say so before the student fills anything in.
 */
export async function prefillFor(roll, programKey) {
    const entry = await eligibleEntry(roll);
    if (!entry) return null;

    const program = PROGRAM_BY_KEY[programKey] || null;
    const collection = await getRegistrationsCollection();
    const existing = program
        ? await collection.findOne(
              { programCode: program.code, rollNumber: entry.rollKey },
              { projection: { _id: 0, registrationId: 1, createdAt: 1 } }
          )
        : null;

    const branch = entry.branchCode ? branchOptionForCode(entry.branchCode) : '';

    return {
        rollKey: entry.rollKey,
        student: {
            fullName: displayName(entry.name),
            rollNumber: entry.rollNo || entry.rollKey,
            collegeEmail: '',
            mobileNumber: '',
            branch: BRANCH_OPTIONS.includes(branch) ? branch : '',
            gender: entry.gender || '',
            residenceType: ROSTER_RESIDENCE,
            hasLaptop: '',
            program: entry.program
        },
        alreadyRegistered: Boolean(existing),
        registeredAt: existing?.createdAt || null
    };
}
