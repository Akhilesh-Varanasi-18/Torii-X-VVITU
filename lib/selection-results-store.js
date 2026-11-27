// =========================================================================
// AI Ready Engineers — selection results: database side
// =========================================================================
//
// SERVER ONLY (§8.7): reaches MongoDB and reads workbooks with exceljs. The
// page talks to it through /api/admin/selection/*.
//
// Everything here writes into `vvitu_hostel_roster` itself, under
// `results.<academicYear>` — see lib/selection-results.js for the layout and why
// it is keyed by year. Nothing here ever touches the roster's own identity fields
// (rollKey, name, branch…); those belong to scripts/seed-hostel-roster.mjs, which
// in turn now leaves `results` alone.

import ExcelJS from 'exceljs';
import { getHostelRosterCollection } from './mongodb';
import {
    SELECTION_ROUNDS,
    INTERVIEW_ROUND,
    isValidYear,
    isValidProgramCode,
    isValidScore,
    roundByKey,
    previousRound,
    parseRollTokens,
    splitPasted,
    looksLikeRoll,
    normaliseRoll,
    normaliseRemarks
} from './selection-results';
import { cleanLabel, MAX_PANELIST } from './interview-panels';

// Every path is scoped to a programme as well as a year. `code` reaches these
// already validated by the route, and assertScope re-checks it because this is
// the one place that builds the field path.
const scopePath = (year, code) => `results.${year}.${code}`;
const roundPath = (year, code, round) => `${scopePath(year, code)}.rounds.${round}`;
const interviewPath = (year, code) => `${scopePath(year, code)}.interview`;

// Defence in depth: every caller validates first, but these two strings become
// MongoDB field paths, so they are re-checked at the one place that builds them.
function assertScope(year, code, round) {
    if (!isValidYear(year)) throw new Error(`Invalid academic year: ${year}`);
    if (!isValidProgramCode(code)) throw new Error(`Invalid programme: ${code}`);
    if (round !== undefined && !roundByKey(round)) throw new Error(`Unknown round: ${round}`);
}

/** The academic years the roster holds, newest first. */
export async function listYears() {
    const collection = await getHostelRosterCollection();
    const years = await collection.distinct('academicYear');
    return years.filter(isValidYear).sort().reverse();
}

/**
 * Headline numbers for one year: how many students the roster holds, how many
 * are on each round's list, and how far the interview panel has got.
 */
export async function yearSummary(year, code) {
    assertScope(year, code);
    const collection = await getHostelRosterCollection();
    // `scored` counts only students who are BOTH scored and still on the
    // interview list. A score can outlive its place on the list — a REPLACE
    // upload takes someone off the round without touching the stars already
    // recorded against them — and counting those would make the page read
    // "69 of 267 scored" when only 68 of the 267 can ever be reached in the
    // scoring list, a gap no amount of scoring could close.
    const facet = {
        roster: [{ $count: 'n' }],
        scored: [
            { $match: { [interviewPath(year, code)]: { $exists: true }, [roundPath(year, code, INTERVIEW_ROUND)]: { $exists: true } } },
            { $count: 'n' }
        ]
    };
    for (const r of SELECTION_ROUNDS) {
        facet[r.key] = [{ $match: { [roundPath(year, code, r.key)]: { $exists: true } } }, { $count: 'n' }];
    }
    const [out] = await collection.aggregate([{ $match: { academicYear: year } }, { $facet: facet }]).toArray();
    const n = (arr) => arr?.[0]?.n || 0;

    // When each round's list was last written — the newest `at` on it.
    const last = await collection
        .aggregate([
            { $match: { academicYear: year } },
            {
                $group: {
                    _id: null,
                    ...Object.fromEntries(SELECTION_ROUNDS.map((r) => [r.key.replace(/-/g, '_'), { $max: `$${roundPath(year, code, r.key)}.at` }]))
                }
            }
        ])
        .toArray();

    return {
        year,
        roster: n(out?.roster),
        rounds: SELECTION_ROUNDS.map((r) => ({
            key: r.key,
            count: n(out?.[r.key]),
            updatedAt: last[0]?.[r.key.replace(/-/g, '_')] || null
        })),
        interview: { qualified: n(out?.[INTERVIEW_ROUND]), scored: n(out?.scored) }
    };
}

// ── Reading an upload ───────────────────────────────────────────────────────

// Header names that mark the roll-number column. Same family as the seed
// script's, case/space-insensitive.
const ROLL_HEADERS = new Set(['roll no', 'rollno', 'roll number', 'rollnumber', 'roll', 'regd no', 'regdno', 'reg no', 'registration number', 'hall ticket', 'hall ticket no', 'htno', 'ht no']);
const foldHeader = (v) => String(v ?? '').toLowerCase().replace(/[._]/g, ' ').replace(/\s+/g, ' ').trim();

const cellText = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
        if (v.text) return String(v.text);
        if (v.richText) return v.richText.map((p) => p.text).join('');
        if (v.result !== undefined) return String(v.result);
        return '';
    }
    return String(v);
};

/**
 * Pull roll numbers out of a table (array of rows of cell strings).
 *
 * If a header naming the roll column is found in the first five rows, ONLY that
 * column is read — the sheet may also hold mobile numbers or emails, and reading
 * them would be noise at best. Otherwise every cell is offered to the roll
 * heuristic: a bare one-column list with no header is the most common thing a
 * person exports.
 */
function rollsFromTable(rows) {
    for (let r = 0; r < Math.min(rows.length, 5); r++) {
        const idx = rows[r].findIndex((c) => ROLL_HEADERS.has(foldHeader(c)));
        if (idx !== -1) {
            return { tokens: rows.slice(r + 1).map((row) => row[idx]), column: String(rows[r][idx]).trim() };
        }
    }
    // No header: keep only cells that look like a roll — anything else in a
    // headerless sheet (names, S.No) is not worth listing as "ignored".
    return { tokens: rows.flat().filter((c) => looksLikeRoll(normaliseRoll(c))), column: null };
}

async function tableFromWorkbook(buffer) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets.find((s) => s.rowCount > 0) || wb.worksheets[0];
    if (!ws) throw new Error('That workbook has no sheets.');
    const rows = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
        // row.values is 1-based with a hole at [0]; slice it off so indexes line up.
        rows.push((row.values || []).slice(1).map(cellText));
    });
    return rows;
}

function tableFromCsv(text) {
    // Roll numbers and the headers around them never contain quoted commas, so a
    // plain split is enough; quotes are stripped from each cell.
    return text
        .split(/\r?\n/)
        .map((line) => line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, '')))
        .filter((row) => row.some(Boolean));
}

/**
 * Everything the admin can send — pasted text, an .xlsx, a .csv/.txt — reduced
 * to { keys, ignored, duplicates, column }.
 */
export async function readRollInput({ text, file }) {
    if (file) {
        const name = String(file.name || '').toLowerCase();
        const buffer = Buffer.from(await file.arrayBuffer());
        let table;
        if (/\.xlsx$/.test(name)) {
            try {
                table = await tableFromWorkbook(buffer);
            } catch (error) {
                throw new Error(`Could not read that workbook (${error.message}). Save it as .xlsx and try again.`);
            }
        } else if (/\.(csv|txt)$/.test(name)) {
            table = tableFromCsv(buffer.toString('utf8'));
        } else {
            throw new Error('Upload an .xlsx, .csv or .txt file — or paste the roll numbers instead.');
        }
        const { tokens, column } = rollsFromTable(table);
        return { ...parseRollTokens(tokens), column };
    }
    return { ...parseRollTokens(splitPasted(text)), column: null };
}

// ── Planning and applying a round upload ────────────────────────────────────

const studentOut = (d) => ({
    rollKey: d.rollKey,
    rollNo: d.rollNo,
    name: d.name,
    branch: d.branchCode || d.program || ''
});

/**
 * Work out what an upload WOULD do, without writing. The page shows this as the
 * preview; committing re-runs it from the same input and applies the result, so
 * what was previewed is exactly what is written (nothing is cached between the
 * two calls).
 *
 * Only roll numbers on the selected year's roster are written. Everything else is
 * reported back by name, split into "on the roster under another year" (usually
 * the wrong year selected) and "not on the roster at all" (usually a typo).
 */
export async function planRoundUpload({ year, code, round, mode, keys }) {
    assertScope(year, code, round);
    const collection = await getHostelRosterCollection();
    const path = roundPath(year, code, round);
    const prev = previousRound(round);

    const projection = { rollKey: 1, rollNo: 1, name: 1, branchCode: 1, program: 1, academicYear: 1, [path]: 1 };
    if (prev) projection[roundPath(year, code, prev.key)] = 1;

    const found = keys.length ? await collection.find({ rollKey: { $in: keys } }, { projection }).toArray() : [];
    const byKey = new Map(found.map((d) => [d.rollKey, d]));

    const matched = [];
    const otherYear = [];
    const notFound = [];
    for (const key of keys) {
        const doc = byKey.get(key);
        if (!doc) notFound.push(key);
        else if (doc.academicYear !== year) otherYear.push({ ...studentOut(doc), academicYear: doc.academicYear });
        else matched.push(doc);
    }

    const has = (doc, r) => Boolean(doc.results?.[year]?.[code]?.rounds?.[r]);
    const alreadyOn = matched.filter((d) => has(d, round));
    const toAdd = matched.filter((d) => !has(d, round));

    // REPLACE takes off anyone on the current list who is not in this upload.
    let toRemove = [];
    if (mode === 'replace') {
        const matchedKeys = matched.map((d) => d.rollKey);
        toRemove = await collection
            .find(
                { academicYear: year, [path]: { $exists: true }, rollKey: { $nin: matchedKeys } },
                { projection: { rollKey: 1, rollNo: 1, name: 1, branchCode: 1, program: 1, [interviewPath(year, code)]: 1 } }
            )
            .toArray();
    }

    // A student on Round 2's list who is not on Round 1's is almost always a
    // mistake in one of the two files — but not always (a Round 1 list not yet
    // uploaded, a late addition the panel agreed), so it is a warning the admin
    // reads before committing, not a refusal.
    const currentCount = await countOn(collection, year, round);

    let notOnPrevious = [];
    let previousCount = 0;
    if (prev) {
        previousCount = await collection.countDocuments({ academicYear: year, [roundPath(year, code, prev.key)]: { $exists: true } });
        if (previousCount > 0) notOnPrevious = matched.filter((d) => !has(d, prev.key));
    }

    return {
        year,
        code,
        round,
        mode,
        received: keys.length,
        matched: matched.length,
        toAdd: toAdd.map(studentOut),
        alreadyOn: alreadyOn.length,
        toRemove: toRemove.map((d) => ({ ...studentOut(d), scored: Boolean(d.results?.[year]?.[code]?.interview) })),
        otherYear,
        notFound,
        previous: prev ? { key: prev.key, label: prev.label, count: previousCount, missing: notOnPrevious.map(studentOut) } : null,
        listBefore: currentCount,
        listAfter: mode === 'replace' ? matched.length : currentCount + toAdd.length,
        _matchedKeys: matched.map((d) => d.rollKey),
        _removeKeys: toRemove.map((d) => d.rollKey)
    };
}

const countOn = (collection, year, round) => collection.countDocuments({ academicYear: year, [roundPath(year, code, round)]: { $exists: true } });

/**
 * Write a plan. Students already on the list keep their original `at` — a
 * re-upload of the same list should not make it look as if everyone was added
 * just now.
 *
 * Taking someone off the interview round does NOT delete stars already recorded
 * against them: a list correction should not destroy the panel's work, and if
 * they go back on the list the score is there again. While they are off it, the
 * score is ignored everywhere it would be read (yearSummary, funnelStudents) —
 * `toRemove` flags which of them are scored so it is a deliberate choice, not a
 * surprise.
 */
export async function applyRoundUpload(plan) {
    const { year, code, round } = plan;
    assertScope(year, code, round);
    const collection = await getHostelRosterCollection();
    const path = roundPath(year, code, round);
    const now = new Date();

    const added = plan._matchedKeys.length
        ? await collection.updateMany(
              { academicYear: year, rollKey: { $in: plan._matchedKeys }, [path]: { $exists: false } },
              { $set: { [path]: { at: now } } }
          )
        : { modifiedCount: 0 };

    const removed = plan._removeKeys.length
        ? await collection.updateMany({ academicYear: year, rollKey: { $in: plan._removeKeys } }, { $unset: { [path]: '' } })
        : { modifiedCount: 0 };

    return { added: added.modifiedCount, removed: removed.modifiedCount, total: await countOn(collection, year, round) };
}

/** Strip the internal fields a plan carries for applyRoundUpload. */
export function publicPlan(plan) {
    const { _matchedKeys, _removeKeys, ...rest } = plan;
    return rest;
}

// ── Interview scoring ───────────────────────────────────────────────────────

/**
 * Everyone on the interview round's list for `year`, with any score already
 * given. The page searches this list locally — a cohort that reaches interview
 * is a few dozen to a couple of hundred students, so one request and an instant
 * client-side filter beats a round trip per keystroke.
 */
export async function interviewCandidates(year, code) {
    assertScope(year, code);
    const collection = await getHostelRosterCollection();
    const docs = await collection
        .find(
            { academicYear: year, [roundPath(year, code, INTERVIEW_ROUND)]: { $exists: true } },
            {
                projection: {
                    rollKey: 1,
                    rollNo: 1,
                    name: 1,
                    branchCode: 1,
                    program: 1,
                    gender: 1,
                    [interviewPath(year, code)]: 1,
                    [`${scopePath(year, code)}.allocation`]: 1
                }
            }
        )
        .sort({ name: 1 })
        .toArray();
    return docs.map((d) => {
        const iv = d.results?.[year]?.[code]?.interview || null;
        const al = d.results?.[year]?.[code]?.allocation || null;
        return {
            ...studentOut(d),
            gender: d.gender || '',
            // Drives the pre-selected "Scored by" and the slot line on the card.
            allocation: al
                ? { panel: al.panel || '', panelist: al.panelist || '', date: al.date || '', start: al.start || '', end: al.end || '' }
                : null,
            score: iv
                ? { coding: iv.coding, communication: iv.communication, remarks: iv.remarks || '', scoredBy: iv.scoredBy || '', scoredAt: iv.scoredAt }
                : null
        };
    });
}

/**
 * Record (or overwrite) one student's interview stars, optional remarks and the
 * panelist who took the interview. Refuses anyone not on the interview list for
 * that year: scoring someone who never qualified would put a number on a record
 * the panel never saw.
 *
 * Returns the saved score, or null when the student is not on the list.
 */
export async function saveInterviewScore({ year, code, rollKey, coding, communication, remarks, scoredBy }) {
    assertScope(year, code);
    if (!isValidScore(coding) || !isValidScore(communication)) throw new Error('Scores must be whole stars from 1 to 5.');
    const collection = await getHostelRosterCollection();
    const text = normaliseRemarks(remarks);
    // `remarks` is written only when there is something to write. Storing '' on
    // every save would put an empty field on all 267 documents and make
    // "has a remark" a check on the value rather than on the key; $unset keeps
    // absence meaning absence, the same way a round's absence means not-listed.
    const score = { coding, communication, scoredAt: new Date() };
    if (text) score.remarks = text;
    // Who actually took the interview. The page pre-selects the panelist this
    // student was timetabled to, so this is usually that person — but a panel
    // covering for a colleague can change it, and then this records what
    // happened rather than what was planned. Absent when nobody picked.
    let who = cleanLabel(scoredBy, MAX_PANELIST);
    // Fall back to the panel this student is timetabled to when the client sends
    // no name. The form pre-selects that same panelist, so in the normal case
    // this changes nothing — but a tab opened before the timetable was uploaded
    // has no allocation to pre-select from and would save the score anonymously.
    // Five real scores were recorded that way before this existed, which left
    // the panel card reading 21 and the panelist's own tally 16.
    if (!who) {
        const doc = await collection.findOne(
            { rollKey, academicYear: year },
            { projection: { [`results.${year}.allocation.panelist`]: 1 } }
        );
        who = cleanLabel(doc?.results?.[year]?.allocation?.panelist, MAX_PANELIST);
    }
    if (who) score.scoredBy = who;
    const res = await collection.updateOne(
        { rollKey, academicYear: year, [roundPath(year, code, INTERVIEW_ROUND)]: { $exists: true } },
        { $set: { [interviewPath(year, code)]: score } }
    );
    return res.matchedCount ? score : null;
}

// ── Who is on a round's list ────────────────────────────────────────────────

/**
 * Everyone on one round's list for `year`, for the list that opens when a round
 * tile is clicked. Basic identity only (roll, name, branch, gender) plus when
 * they were put on the list — no contact details, the same line §8.10 draws for
 * the public lookup. For the interview round the stars ride along, so the list
 * doubles as the panel's "who is still unscored" view.
 *
 * Unpaged: the largest list is the Demo Test, bounded by the year's roster
 * (~1,400), and the page filters it locally.
 */
export async function roundStudents(year, code, round) {
    assertScope(year, code, round);
    const collection = await getHostelRosterCollection();
    const path = roundPath(year, code, round);
    const withScore = round === INTERVIEW_ROUND;
    const projection = { rollKey: 1, rollNo: 1, name: 1, branchCode: 1, program: 1, gender: 1, [path]: 1 };
    if (withScore) projection[interviewPath(year, code)] = 1;

    const docs = await collection
        .find({ academicYear: year, [path]: { $exists: true } }, { projection })
        .sort({ name: 1 })
        .toArray();

    return docs.map((d) => {
        const r = d.results?.[year]?.[code] || {};
        const out = { ...studentOut(d), gender: d.gender || '', addedAt: r.rounds?.[round]?.at || null };
        if (withScore) {
            const iv = r.interview;
            out.score = iv ? { coding: iv.coding, communication: iv.communication, remarks: iv.remarks || '' } : null;
        }
        return out;
    });
}

// ── Export ──────────────────────────────────────────────────────────────────

/**
 * Everyone on at least one round's list for `year`, with which lists they are on
 * and their interview stars — the "funnel" sheet of the all-rounds export. A
 * student on no list at all is left out: the roster is ~1,400 and the export is
 * about who moved through the selection, not who never entered it.
 *
 * Same identity-only line as roundStudents (§8.10): no mobile, no email.
 */
export async function funnelStudents(year, code) {
    assertScope(year, code);
    const collection = await getHostelRosterCollection();
    const docs = await collection
        .find(
            { academicYear: year, $or: SELECTION_ROUNDS.map((r) => ({ [roundPath(year, code, r.key)]: { $exists: true } })) },
            { projection: { rollKey: 1, rollNo: 1, name: 1, branchCode: 1, program: 1, gender: 1, [scopePath(year, code)]: 1 } }
        )
        .sort({ name: 1 })
        .toArray();

    return docs.map((d) => {
        const r = d.results?.[year]?.[code] || {};
        // Only report stars for someone still on the interview list. A score
        // outlives a REPLACE that takes its student off the round, and reading it
        // unconditionally put rows like "Furthest Stage: Round 1 — Coding 5,
        // Communication 5" into the export: a perfect interview score beside a
        // student who never reached the interview. Same gate as yearSummary.
        const iv = r.rounds?.[INTERVIEW_ROUND] ? r.interview : null;
        return {
            ...studentOut(d),
            gender: d.gender || '',
            rounds: Object.fromEntries(SELECTION_ROUNDS.map((x) => [x.key, r.rounds?.[x.key]?.at || null])),
            score: iv
                ? { coding: iv.coding, communication: iv.communication, remarks: iv.remarks || '', scoredAt: iv.scoredAt || null }
                : null
        };
    });
}
