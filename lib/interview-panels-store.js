// =========================================================================
// AI Ready Engineers — interview panel allocation: database side
// =========================================================================
//
// SERVER ONLY (§8.7): reaches MongoDB and reads workbooks with exceljs.
//
// Writes `results.<year>.allocation` on each student's vvitu_hostel_roster
// document — see lib/interview-panels.js for the shape and why a panel is a
// label rather than an enum. Nothing here touches the roster's identity fields
// or the round lists; those belong to the seed script and to
// selection-results-store.js respectively.

import ExcelJS from 'exceljs';
import { getHostelRosterCollection } from './mongodb';
import { isValidYear, isValidProgramCode, normaliseRoll, looksLikeRoll, INTERVIEW_ROUND } from './selection-results';
import {
    headerField,
    cleanLabel,
    paginate,
    NO_PANEL,
    parseDate,
    parseTime,
    parseSlotRange,
    isValidDate,
    isValidTime,
    comparePanels,
    slotKey,
    MAX_PANEL,
    MAX_PANELIST,
    EXTRA_PANELISTS,
    MAX_LINK
} from './interview-panels';

const scopePath = (year, code) => `results.${year}.${code}`;
const allocationPath = (year, code) => `${scopePath(year, code)}.allocation`;
const interviewPath = (year, code) => `${scopePath(year, code)}.interview`;
const roundPath = (year, code, round) => `${scopePath(year, code)}.rounds.${round}`;

function assertScope(year, code) {
    if (!isValidYear(year)) throw new Error(`Invalid academic year: ${year}`);
    if (!isValidProgramCode(code)) throw new Error(`Invalid programme: ${code}`);
}

// ── Reading the sheet ───────────────────────────────────────────────────────

const cellText = (v) => {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return v;
    if (typeof v === 'object') {
        if (v.text) return String(v.text);
        if (v.richText) return v.richText.map((p) => p.text).join('');
        if (v.result !== undefined) return v.result;
        if (v.hyperlink) return String(v.hyperlink);
        return '';
    }
    return v;
};

/**
 * Find the header row and map each recognised column to its field. Unlike the
 * round-list upload — where a bare column of roll numbers is the common case —
 * an allocation carries at least a panel and a time beside the roll, so a
 * header is required. Saying so plainly beats silently importing one column.
 */
function mapColumns(rows) {
    for (let r = 0; r < Math.min(rows.length, 6); r++) {
        const map = {};
        rows[r].forEach((cell, i) => {
            const field = headerField(cell);
            // First header wins: a sheet with both "Time" and "Start Time" should
            // use the more specific one, which we get by not overwriting.
            if (field && map[field] === undefined) map[field] = i;
        });
        if (map.roll !== undefined && (map.panel !== undefined || map.start !== undefined || map.date !== undefined)) {
            return { headerRow: r, map };
        }
    }
    return null;
}

async function tableFromWorkbook(buffer) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets.find((s) => s.rowCount > 0) || wb.worksheets[0];
    if (!ws) throw new Error('That workbook has no sheets.');
    const rows = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
        rows.push((row.values || []).slice(1).map(cellText));
    });
    return rows;
}

function tableFromCsv(text) {
    return text
        .split(/\r?\n/)
        .map((line) => line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, '')))
        .filter((row) => row.some((c) => String(c).trim()));
}

/**
 * Everything the admin can send reduced to allocation rows.
 *
 * Returns { rows, ignored, duplicates, columns, warnings }. A row is kept only
 * when its roll number looks like one; everything else is reported rather than
 * dropped quietly. `warnings` carries the soft problems — a morning start time
 * in an evening programme, an end before its start — which the preview shows
 * and the admin decides about.
 */
export async function readAllocationInput({ file, text }) {
    let table;
    if (file) {
        const name = String(file.name || '').toLowerCase();
        const buffer = Buffer.from(await file.arrayBuffer());
        if (/\.xlsx$/.test(name)) {
            try {
                table = await tableFromWorkbook(buffer);
            } catch (error) {
                throw new Error(`Could not read that workbook (${error.message}). Save it as .xlsx and try again.`);
            }
        } else if (/\.(csv|txt)$/.test(name)) {
            table = tableFromCsv(buffer.toString('utf8'));
        } else {
            throw new Error('Upload an .xlsx or .csv allocation sheet.');
        }
    } else {
        table = tableFromCsv(text || '');
    }

    const found = mapColumns(table);
    if (!found) {
        throw new Error(
            'Could not find the columns. The sheet needs a "Roll No" header plus at least one of "Panel", "Date" or "Start Time" — download the sample to see the format.'
        );
    }

    const { headerRow, map } = found;
    const at = (row, field) => (map[field] === undefined ? '' : row[map[field]]);

    const seen = new Map();
    const rows = [];
    const ignored = [];
    const warnings = [];
    let duplicates = 0;

    for (let r = headerRow + 1; r < table.length; r++) {
        const raw = table[r];
        const rollKey = normaliseRoll(at(raw, 'roll'));
        if (!looksLikeRoll(rollKey)) {
            const shown = String(at(raw, 'roll') ?? '').trim();
            if (shown) ignored.push(shown);
            continue;
        }
        if (seen.has(rollKey)) {
            duplicates++;
            continue;
        }

        // A single "Time" column often holds the whole range; separate Start/End
        // columns win when both are present.
        let start = parseTime(at(raw, 'start'));
        let end = parseTime(at(raw, 'end'));
        if (!end && map.start !== undefined) {
            const range = parseSlotRange(at(raw, 'start'));
            if (range.start) start = range.start;
            if (range.end) end = range.end;
        }

        const row = {
            rollKey,
            panel: cleanLabel(at(raw, 'panel'), MAX_PANEL),
            panelist: cleanLabel(at(raw, 'panelist'), MAX_PANELIST),
            date: parseDate(at(raw, 'date')),
            start,
            end,
            link: cleanLabel(at(raw, 'link'), MAX_LINK)
        };

        const where = `${rollKey} (row ${r + 1})`;
        if (map.date !== undefined && String(at(raw, 'date') ?? '').trim() && !row.date) {
            warnings.push(`${where}: could not read the date "${String(at(raw, 'date')).trim()}" — left blank.`);
        }
        if (row.start && row.start < '08:00') {
            warnings.push(`${where}: start time reads ${row.start}. Interviews run in the afternoon — did you mean PM?`);
        }
        if (row.start && row.end && row.end <= row.start) {
            warnings.push(`${where}: end time ${row.end} is not after the start ${row.start}.`);
        }

        seen.set(rollKey, true);
        rows.push(row);
    }

    return { rows, ignored, duplicates, columns: Object.keys(map), warnings };
}

// ── Planning and applying ───────────────────────────────────────────────────

const studentOut = (d) => ({
    rollKey: d.rollKey,
    rollNo: d.rollNo,
    name: d.name,
    branch: d.branchCode || d.program || ''
});

/**
 * Work out what an allocation upload WOULD do, without writing. Committing
 * recomputes this from the same input, so a tampered preview cannot write
 * anything the server would not have planned itself — same contract as the
 * round-list upload.
 */
export async function planAllocationUpload({ year, code, mode, rows }) {
    assertScope(year, code);
    const collection = await getHostelRosterCollection();
    const keys = rows.map((r) => r.rollKey);

    const docs = keys.length
        ? await collection
              .find(
                  { rollKey: { $in: keys } },
                  {
                      projection: {
                          rollKey: 1,
                          rollNo: 1,
                          name: 1,
                          branchCode: 1,
                          program: 1,
                          academicYear: 1,
                          [allocationPath(year, code)]: 1,
                          [roundPath(year, code, INTERVIEW_ROUND)]: 1
                      }
                  }
              )
              .toArray()
        : [];
    const byKey = new Map(docs.map((d) => [d.rollKey, d]));

    const matched = [];
    const otherYear = [];
    const notFound = [];
    for (const row of rows) {
        const doc = byKey.get(row.rollKey);
        if (!doc) notFound.push(row.rollKey);
        else if (doc.academicYear !== year) otherYear.push({ ...studentOut(doc), academicYear: doc.academicYear });
        else matched.push({ row, doc });
    }

    const had = ({ doc }) => Boolean(doc.results?.[year]?.[code]?.allocation);
    const changed = matched.filter(had);
    const fresh = matched.filter((m) => !had(m));

    // Scheduling somebody who is not on the interview round's list is worth
    // saying out loud — usually the list has not been uploaded yet, occasionally
    // it is the wrong sheet. A warning, never a refusal (same call the round
    // upload makes about a missing previous round).
    const notOnList = matched.filter(({ doc }) => !doc.results?.[year]?.[code]?.rounds?.[INTERVIEW_ROUND]).map(({ doc }) => studentOut(doc));

    let toClear = [];
    if (mode === 'replace') {
        const matchedKeys = matched.map((m) => m.row.rollKey);
        toClear = await collection
            .find(
                { academicYear: year, [allocationPath(year, code)]: { $exists: true }, rollKey: { $nin: matchedKeys } },
                { projection: { rollKey: 1, rollNo: 1, name: 1, branchCode: 1, program: 1, [interviewPath(year, code)]: 1 } }
            )
            .toArray();
    }

    const before = await collection.countDocuments({ academicYear: year, [allocationPath(year, code)]: { $exists: true } });

    // What the panel strip will look like afterwards — the quickest way for the
    // person uploading to see that a column mapped to the wrong field.
    const panelTally = {};
    matched.forEach(({ row }) => {
        const label = row.panel || '(no panel)';
        panelTally[label] = panelTally[label] || { panel: label, count: 0, panelists: new Set(), dates: new Set() };
        panelTally[label].count++;
        if (row.panelist) panelTally[label].panelists.add(row.panelist);
        if (row.date) panelTally[label].dates.add(row.date);
    });
    const panels = Object.values(panelTally)
        .map((p) => ({ panel: p.panel, count: p.count, panelists: [...p.panelists].sort(), dates: [...p.dates].sort() }))
        .sort((a, b) => comparePanels(a.panel, b.panel));

    return {
        year,
        code,
        mode,
        received: rows.length,
        matched: matched.length,
        added: fresh.length,
        updated: changed.length,
        toClear: toClear.map((d) => ({ ...studentOut(d), scored: Boolean(d.results?.[year]?.[code]?.interview) })),
        otherYear,
        notFound,
        notOnList,
        panels,
        missingPanel: matched.filter(({ row }) => !row.panel).length,
        missingDate: matched.filter(({ row }) => !row.date).length,
        missingTime: matched.filter(({ row }) => !row.start).length,
        listBefore: before,
        listAfter: mode === 'replace' ? matched.length : before + fresh.length,
        _writes: matched.map(({ row }) => row),
        _clearKeys: toClear.map((d) => d.rollKey)
    };
}

export function publicAllocationPlan(plan) {
    const { _writes, _clearKeys, ...rest } = plan;
    return rest;
}

/** Write a plan. Only the allocation is touched — a student's stars survive a
 *  re-timetabling, which happens often and must never cost the panel its work. */
export async function applyAllocationUpload(plan) {
    const { year, code } = plan;
    assertScope(year, code);
    const collection = await getHostelRosterCollection();
    const now = new Date();

    let written = 0;
    const writes = plan._writes.map((row) => ({
        updateOne: {
            filter: { rollKey: row.rollKey, academicYear: year },
            update: {
                $set: {
                    [allocationPath(year, code)]: {
                        panel: row.panel,
                        panelist: row.panelist,
                        date: row.date,
                        start: row.start,
                        end: row.end,
                        link: row.link,
                        at: now
                    }
                }
            }
        }
    }));
    for (let i = 0; i < writes.length; i += 500) {
        const res = await collection.bulkWrite(writes.slice(i, i + 500), { ordered: false });
        written += res.modifiedCount + res.upsertedCount;
    }

    const cleared = plan._clearKeys.length
        ? await collection.updateMany(
              { academicYear: year, rollKey: { $in: plan._clearKeys } },
              { $unset: { [allocationPath(year, code)]: '' } }
          )
        : { modifiedCount: 0 };

    return {
        written,
        cleared: cleared.modifiedCount,
        total: await collection.countDocuments({ academicYear: year, [allocationPath(year, code)]: { $exists: true } })
    };
}

// ── Reading it back ─────────────────────────────────────────────────────────

const toScore = (iv) =>
    iv
        ? {
              coding: iv.coding,
              communication: iv.communication,
              total: iv.coding + iv.communication,
              remarks: iv.remarks || '',
              scoredBy: iv.scoredBy || '',
              scoredAt: iv.scoredAt || null
          }
        : null;

const toAllocation = (a) =>
    a ? { panel: a.panel || '', panelist: a.panelist || '', date: a.date || '', start: a.start || '', end: a.end || '', link: a.link || '' } : null;

const mean = (nums) => (nums.length ? Number((nums.reduce((x, y) => x + y, 0) / nums.length).toFixed(2)) : null);

/**
 * Everyone who is either on the interview list or holds an allocation, with
 * their slot and their score.
 *
 * Both sides are included deliberately. A student on the list with no slot is
 * the panel's "still to be scheduled" pile; a student with a slot who is not on
 * the list is a timetabling mistake worth seeing rather than hiding. The page
 * filters this locally — a cohort that reaches interview is a couple of hundred
 * students, so one request beats a round trip per filter change.
 *
 * Identity only (§8.10): roll, name, branch, gender. No mobile, no email.
 */
export async function panelRoster(year, code) {
    assertScope(year, code);
    const collection = await getHostelRosterCollection();
    const docs = await collection
        .find(
            {
                academicYear: year,
                $or: [{ [roundPath(year, code, INTERVIEW_ROUND)]: { $exists: true } }, { [allocationPath(year, code)]: { $exists: true } }]
            },
            {
                projection: {
                    rollKey: 1,
                    rollNo: 1,
                    name: 1,
                    branchCode: 1,
                    program: 1,
                    gender: 1,
                    [scopePath(year, code)]: 1
                }
            }
        )
        .sort({ name: 1 })
        .toArray();

    return docs.map((d) => {
        const r = d.results?.[year]?.[code] || {};
        const onList = Boolean(r.rounds?.[INTERVIEW_ROUND]);
        return {
            ...studentOut(d),
            gender: d.gender || '',
            onList,
            allocation: toAllocation(r.allocation),
            // Same gate as everywhere else: a score only counts while its student
            // is on the interview list.
            score: onList ? toScore(r.interview) : null
        };
    });
}

/**
 * The panel view's headline figures, panel strip and day strip, computed from
 * the same roster the table shows so the two can never disagree.
 */
export function summarisePanels(students) {
    const scheduled = students.filter((s) => s.allocation);
    const completed = students.filter((s) => s.score);

    const group = (keyOf) => {
        const out = new Map();
        for (const s of students) {
            const key = keyOf(s);
            if (key === null) continue;
            if (!out.has(key)) out.set(key, []);
            out.get(key).push(s);
        }
        return out;
    };

    const stats = (list) => {
        const done = list.filter((s) => s.score);
        return {
            assigned: list.length,
            completed: done.length,
            pending: list.length - done.length,
            avgCoding: mean(done.map((s) => s.score.coding)),
            avgCommunication: mean(done.map((s) => s.score.communication)),
            avgTotal: mean(done.map((s) => s.score.total))
        };
    };

    const panels = [...group((s) => s.allocation?.panel || null).entries()]
        .map(([panel, list]) => ({
            panel,
            panelists: [...new Set(list.map((s) => s.allocation.panelist).filter(Boolean))].sort(),
            dates: [...new Set(list.map((s) => s.allocation.date).filter(Boolean))].sort(),
            ...stats(list)
        }))
        .sort((a, b) => comparePanels(a.panel, b.panel));

    const days = [...group((s) => s.allocation?.date || null).entries()]
        .map(([date, list]) => ({ date, panels: [...new Set(list.map((s) => s.allocation.panel).filter(Boolean))].length, ...stats(list) }))
        .sort((a, b) => a.date.localeCompare(b.date));

    const panelists = [...group((s) => s.allocation?.panelist || null).entries()]
        .map(([panelist, list]) => ({ panelist, ...stats(list) }))
        .sort((a, b) => a.panelist.localeCompare(b.panelist));

    // Who actually recorded the scores, which is not always who was timetabled.
    const scoredBy = {};
    completed.forEach((s) => {
        const who = s.score.scoredBy || '(not recorded)';
        scoredBy[who] = (scoredBy[who] || 0) + 1;
    });

    // The star histogram, 1-5 for each field.
    const histogram = { coding: [0, 0, 0, 0, 0], communication: [0, 0, 0, 0, 0] };
    completed.forEach((s) => {
        histogram.coding[s.score.coding - 1]++;
        histogram.communication[s.score.communication - 1]++;
    });

    return {
        totals: {
            onList: students.filter((s) => s.onList).length,
            scheduled: scheduled.length,
            unscheduled: students.filter((s) => s.onList && !s.allocation).length,
            orphanSlot: students.filter((s) => s.allocation && !s.onList).length,
            completed: completed.length,
            pending: scheduled.length - scheduled.filter((s) => s.score).length,
            withRemarks: completed.filter((s) => s.score.remarks).length,
            avgCoding: mean(completed.map((s) => s.score.coding)),
            avgCommunication: mean(completed.map((s) => s.score.communication)),
            avgTotal: mean(completed.map((s) => s.score.total))
        },
        panels,
        days,
        panelists,
        scoredBy: Object.entries(scoredBy)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count),
        histogram
    };
}

const fold = (v) => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * Narrow the roster the way the page's controls describe.
 *
 * This runs on the SERVER so a page of ten rows costs a response of ten rows.
 * It filters the already-loaded roster rather than querying Mongo per filter:
 * a cohort that reaches interview is a couple of hundred documents, the read is
 * one indexed query either way, and doing it in one place keeps the filtered
 * count and the page in step.
 */
function filterStudents(students, { q, panel, day, branch, status }) {
    const query = String(q || '').trim();
    const words = query.toUpperCase().split(/\s+/).filter(Boolean);
    const qRoll = fold(query);

    return students.filter((s) => {
        if (panel === NO_PANEL && s.allocation) return false;
        if (panel && panel !== NO_PANEL && s.allocation?.panel !== panel) return false;
        if (day && s.allocation?.date !== day) return false;
        if (branch && s.branch !== branch) return false;
        if (status === 'completed' && !s.score) return false;
        if (status === 'pending' && s.score) return false;
        if (!query) return true;
        // Roll match needs three characters before it is worth trying, so a
        // two-letter name fragment does not also scan every roll number.
        return (qRoll.length >= 3 && fold(s.rollNo).includes(qRoll)) || words.every((w) => s.name.toUpperCase().includes(w));
    });
}

function sortStudents(students, sort) {
    const key = (s) => slotKey(s.allocation);
    return [...students].sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (sort === 'total') return (b.score?.total ?? -1) - (a.score?.total ?? -1) || a.name.localeCompare(b.name);
        if (sort === 'panel') {
            const p = comparePanels(a.allocation?.panel || '~', b.allocation?.panel || '~');
            return p || key(a).localeCompare(key(b));
        }
        // Default: chronological, so the table reads like the day's timetable
        // rather than an alphabetical list that jumps between panels.
        return key(a).localeCompare(key(b)) || a.name.localeCompare(b.name);
    });
}

/**
 * Everything GET /api/admin/selection/panels returns.
 *
 * The summary, the panel strip, the day strip and the branch counts are always
 * computed over the WHOLE year, never over the current filter — otherwise
 * choosing a panel would zero out every other panel's card and there would be
 * no way back. Only `students` is filtered, sorted and paged.
 */
export async function panelOverview(year, code, opts = {}) {
    const all = await panelRoster(year, code);
    const summary = summarisePanels(all);

    const branchTally = {};
    all.forEach((s) => {
        if (s.branch) branchTally[s.branch] = (branchTally[s.branch] || 0) + 1;
    });
    const branches = Object.entries(branchTally)
        .map(([branch, count]) => ({ branch, count }))
        .sort((a, b) => b.count - a.count || a.branch.localeCompare(b.branch));

    const matched = filterStudents(all, opts);
    const ordered = sortStudents(matched, opts.sort);
    const page = paginate(ordered, opts.page, opts.limit === undefined ? 'all' : opts.limit);

    return {
        year,
        ...summary,
        branches,
        rosterTotal: all.length,
        total: page.total,
        page: page.page,
        pages: page.pages,
        limit: page.limit,
        students: page.rows
    };
}

/** The names the "Scored by" dropdown offers: everyone timetabled this year,
 *  plus anyone who has already recorded a score but is not on the timetable. */
export async function listPanelists(year, code) {
    assertScope(year, code);
    const collection = await getHostelRosterCollection();
    const [timetabled, recorded] = await Promise.all([
        collection.distinct(`${allocationPath(year, code)}.panelist`, { academicYear: year }),
        collection.distinct(`${interviewPath(year, code)}.scoredBy`, { academicYear: year })
    ]);
    return [...new Set([...timetabled, ...recorded, ...EXTRA_PANELISTS].map((v) => String(v || '').trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b)
    );
}

export { isValidDate, isValidTime };
