import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { isAuthenticated } from '../../../../../lib/dashboard-auth';
import { isValidYear, roundByKey, SELECTION_ROUNDS, INTERVIEW_ROUND, MAX_STARS } from '../../../../../lib/selection-results';
import { roundStudents, funnelStudents } from '../../../../../lib/selection-results-store';
import { panelOverview } from '../../../../../lib/interview-panels-store';
import { formatDate, formatSlot } from '../../../../../lib/interview-panels';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Brand palette — hex because ExcelJS wants ARGB, not CSS vars (same values as
// the registrations export and the list template).
const CORAL = 'FFE2544C';
const HEADER_TEXT = 'FFFFFFFF';
const STRIPE = 'FFFFF3EF';
const MUTED = 'FF64748B';

/** 'YYYY-MM-DD HH:mm' in IST. Vercel runs in UTC, so the offset is explicit (§8.8). */
function formatIST(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return new Date(d.getTime() + 330 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ');
}

// §8.5: department columns carry the short code with no ampersand. branchCode is
// already in that form; the raw `program` fallback ("CSE(AI&ML)") is not.
const branchCell = (b) => String(b || '').replace(/&/g, '');

/**
 * Lay out one styled sheet: a title band (row 1), a meta line (row 2), the coral
 * header (row 3), striped data rows, frozen header and an autofilter — the same
 * shape as the registrations export so the two read as one family.
 */
function addSheet(wb, name, { title, meta, columns, rows }) {
    const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ state: 'frozen', ySplit: 3 }] });

    ws.mergeCells(1, 1, 1, columns.length);
    const t = ws.getCell(1, 1);
    t.value = title;
    t.font = { name: 'Calibri', size: 15, bold: true, color: { argb: CORAL } };
    t.alignment = { vertical: 'middle' };
    ws.getRow(1).height = 24;

    ws.mergeCells(2, 1, 2, columns.length);
    const m = ws.getCell(2, 1);
    m.value = meta;
    m.font = { name: 'Calibri', size: 10, color: { argb: MUTED } };

    ws.columns = columns.map((c) => ({ key: c.key, width: c.width, style: c.style }));
    const head = ws.getRow(3);
    columns.forEach((c, i) => {
        const cell = head.getCell(i + 1);
        cell.value = c.header;
        cell.font = { bold: true, color: { argb: HEADER_TEXT }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORAL } };
        cell.alignment = { vertical: 'middle', horizontal: c.center ? 'center' : 'left' };
    });
    head.height = 20;

    rows.forEach((data, i) => {
        const row = ws.addRow(data);
        columns.forEach((c, ci) => {
            if (c.center) row.getCell(ci + 1).alignment = { horizontal: 'center' };
        });
        if (i % 2 === 1) {
            for (let ci = 1; ci <= columns.length; ci++) {
                row.getCell(ci).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE } };
            }
        }
    });

    ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: columns.length } };
    return ws;
}

const IDENTITY = [
    { header: 'S.No', key: 'sno', width: 7, center: true },
    // Text format: a roll number is an identifier, and Excel would otherwise
    // happily turn an all-digit one into 2.3E+13.
    { header: 'Roll No', key: 'rollNo', width: 18, style: { numFmt: '@' } },
    { header: 'Student Name', key: 'name', width: 32 },
    { header: 'Branch', key: 'branch', width: 10 },
    { header: 'Gender', key: 'gender', width: 10 }
];

// Stars as plain numbers, so the sheet can be sorted and summed. Blank — never
// 0 — when the student has not been scored: "not scored" is not a score of nought.
const SCORE_COLUMNS = [
    { header: `Coding (/${MAX_STARS})`, key: 'coding', width: 13, center: true },
    { header: `Communication (/${MAX_STARS})`, key: 'communication', width: 19, center: true },
    { header: `Total (/${MAX_STARS * 2})`, key: 'total', width: 12, center: true },
    { header: 'Scored By', key: 'scoredBy', width: 14 },
    // Last, and wide with wrapping: remarks are free text and would otherwise
    // push the numbers off the first screen of the sheet. §8.2 — a field the
    // form collects has to leave by the same door as the rest.
    { header: 'Remarks', key: 'remarks', width: 52, style: { alignment: { wrapText: true, vertical: 'top' } } }
];

const scoreCells = (score) =>
    score
        ? {
              coding: score.coding,
              communication: score.communication,
              total: score.coding + score.communication,
              scoredBy: score.scoredBy || '',
              remarks: score.remarks || ''
          }
        : { coding: '', communication: '', total: '', scoredBy: '', remarks: '' };

const identityCells = (s, i) => ({ sno: i + 1, rollNo: s.rollNo || '', name: s.name || '', branch: branchCell(s.branch), gender: s.gender || '' });

function roundSheet(wb, year, round, students, generated) {
    const isInterview = round.key === INTERVIEW_ROUND;
    const columns = [...IDENTITY, ...(isInterview ? SCORE_COLUMNS : []), { header: 'Added to List (IST)', key: 'addedAt', width: 20 }];
    const scored = isInterview ? students.filter((s) => s.score).length : 0;
    addSheet(wb, round.short, {
        title: `AI Ready Engineers ${year} — ${round.label}`,
        meta: [
            `${students.length} student(s)`,
            isInterview ? `${scored} scored` : null,
            round.listOf,
            `Generated ${generated} IST`
        ]
            .filter(Boolean)
            .join('   •   '),
        columns,
        rows: students.map((s, i) => ({
            ...identityCells(s, i),
            ...(isInterview ? scoreCells(s.score) : {}),
            addedAt: formatIST(s.addedAt)
        }))
    });
}


// ── Panel sheets ─────────────────────────────────────────────────

const SLOT_COLUMNS = [
    { header: 'Panel', key: 'panel', width: 12 },
    { header: 'Panelist', key: 'panelist', width: 14 },
    { header: 'Date', key: 'date', width: 16 },
    { header: 'Slot', key: 'slot', width: 18 }
];

const slotCells = (a) => ({
    panel: (a && a.panel) || '',
    panelist: (a && a.panelist) || '',
    date: a && a.date ? formatDate(a.date, { withYear: true }) : '',
    slot: a ? formatSlot(a.start, a.end) : ''
});

/**
 * Three sheets answering the three questions the panel view is built around:
 * how is each panel doing, who sits when, and who is still outstanding.
 *
 * `students` is the chronological roster from panelOverview — one row per
 * student who is on the interview list or holds a slot.
 */
function addPanelSheets(wb, year, overview, generated) {
    const { totals, panels, students } = overview;

    addSheet(wb, 'Panels', {
        title: `AI Ready Engineers ${year} — Interview panels`,
        meta: [
            `${totals.scheduled} scheduled`,
            `${totals.completed} completed`,
            `${totals.pending} pending`,
            totals.avgTotal !== null ? `average ${totals.avgTotal} / ${MAX_STARS * 2}` : null,
            `Generated ${generated} IST`
        ]
            .filter(Boolean)
            .join('   •   '),
        columns: [
            { header: 'Panel', key: 'panel', width: 14 },
            { header: 'Panelist(s)', key: 'panelists', width: 24 },
            { header: 'Days', key: 'days', width: 32 },
            { header: 'Assigned', key: 'assigned', width: 10, center: true },
            { header: 'Completed', key: 'completed', width: 11, center: true },
            { header: 'Pending', key: 'pending', width: 10, center: true },
            { header: 'Done %', key: 'pct', width: 9, center: true },
            { header: `Avg Coding (/${MAX_STARS})`, key: 'avgCoding', width: 17, center: true },
            { header: `Avg Communication (/${MAX_STARS})`, key: 'avgComm', width: 24, center: true },
            { header: `Avg Total (/${MAX_STARS * 2})`, key: 'avgTotal', width: 16, center: true }
        ],
        rows: panels.map((p) => ({
            panel: p.panel,
            panelists: p.panelists.join(', ') || '—',
            days: p.dates.map((d) => formatDate(d)).join(', '),
            assigned: p.assigned,
            completed: p.completed,
            pending: p.pending,
            // A plain number, not a string, so the column sorts properly.
            pct: p.assigned ? Math.round((p.completed / p.assigned) * 100) : 0,
            avgCoding: p.avgCoding === null ? '' : p.avgCoding,
            avgComm: p.avgCommunication === null ? '' : p.avgCommunication,
            avgTotal: p.avgTotal === null ? '' : p.avgTotal
        }))
    });

    const scheduled = students.filter((s) => s.allocation);
    addSheet(wb, 'Schedule', {
        title: `AI Ready Engineers ${year} — Interview schedule`,
        meta: [`${scheduled.length} scheduled student(s)`, 'In slot order', `Generated ${generated} IST`].join('   •   '),
        columns: [...IDENTITY, ...SLOT_COLUMNS, ...SCORE_COLUMNS],
        rows: scheduled.map((s, i) => ({ ...identityCells(s, i), ...slotCells(s.allocation), ...scoreCells(s.score) }))
    });

    // Everyone still outstanding: scheduled but unscored, plus anyone on the
    // interview list with no slot at all — they are pending too, and leaving them
    // out would make the chase list quietly incomplete.
    const pending = students.filter((s) => !s.score && (s.allocation || s.onList));
    addSheet(wb, 'Pending', {
        title: `AI Ready Engineers ${year} — Pending interviews`,
        meta: [`${pending.length} still to score`, `${totals.unscheduled} of them have no slot yet`, `Generated ${generated} IST`].join(
            '   •   '
        ),
        columns: [...IDENTITY, ...SLOT_COLUMNS, { header: 'Status', key: 'status', width: 24 }],
        rows: pending.map((s, i) => ({
            ...identityCells(s, i),
            ...slotCells(s.allocation),
            status: s.allocation ? 'Scheduled · not scored' : 'On the list · no slot yet'
        }))
    });
}

/**
 * GET ?year=&round= — the selection results as a workbook.
 *
 *   round=<key>   that round's list only (what is open under the round tile).
 *   view=panels   the three panel sheets only — Panels, Schedule, Pending.
 *   neither       everything: a "Funnel" sheet first — one row per student on
 *                 any list, a column per round, how far they got and their
 *                 interview stars — then one sheet per round, then the panel
 *                 sheets.
 *
 * Identity only, no contact details (§8.10). Exports the whole list regardless of
 * the page's search/branch filter; the sheet's own autofilter does that job.
 */
export async function GET(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const year = request.nextUrl.searchParams.get('year') || '';
    const roundKey = request.nextUrl.searchParams.get('round') || '';
    if (!isValidYear(year)) return NextResponse.json({ success: false, message: 'Pick an academic year.' }, { status: 400 });
    const round = roundKey ? roundByKey(roundKey) : null;
    if (roundKey && !round) return NextResponse.json({ success: false, message: 'Unknown round.' }, { status: 400 });
    const view = request.nextUrl.searchParams.get('view') || '';
    if (view && view !== 'panels') return NextResponse.json({ success: false, message: 'Unknown view.' }, { status: 400 });

    const now = new Date();
    const generated = formatIST(now);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ToriiMinds × VVITU';
    wb.created = now;

    try {
        if (view === 'panels') {
            addPanelSheets(wb, year, await panelOverview(year), generated);
        } else if (round) {
            roundSheet(wb, year, round, await roundStudents(year, round.key), generated);
        } else {
            const [funnel, lists] = await Promise.all([
                funnelStudents(year),
                Promise.all(SELECTION_ROUNDS.map((r) => roundStudents(year, r.key)))
            ]);

            // "Furthest stage" is the LAST list a student is on, in round order —
            // the column people actually sort by. It is a reading of the lists, not
            // a verdict: absence from a later list may just mean it isn't uploaded.
            const furthest = (s) => {
                for (let i = SELECTION_ROUNDS.length - 1; i >= 0; i--) {
                    if (s.rounds[SELECTION_ROUNDS[i].key]) return SELECTION_ROUNDS[i].short;
                }
                return '';
            };

            addSheet(wb, 'Funnel', {
                title: `AI Ready Engineers ${year} — Selection Funnel`,
                meta: [
                    `${funnel.length} student(s) on at least one list`,
                    ...SELECTION_ROUNDS.map((r, i) => `${r.short}: ${lists[i].length}`),
                    `Generated ${generated} IST`
                ].join('   •   '),
                columns: [
                    ...IDENTITY,
                    ...SELECTION_ROUNDS.map((r) => ({ header: r.short, key: `r_${r.key}`, width: 11, center: true })),
                    { header: 'Furthest Stage', key: 'furthest', width: 15 },
                    ...SCORE_COLUMNS
                ],
                rows: funnel.map((s, i) => ({
                    ...identityCells(s, i),
                    ...Object.fromEntries(SELECTION_ROUNDS.map((r) => [`r_${r.key}`, s.rounds[r.key] ? 'Yes' : ''])),
                    furthest: furthest(s),
                    ...scoreCells(s.score)
                }))
            });

            SELECTION_ROUNDS.forEach((r, i) => roundSheet(wb, year, r, lists[i], generated));
            addPanelSheets(wb, year, await panelOverview(year), generated);
        }
    } catch (error) {
        console.error('[admin/selection/export] failed:', error);
        return NextResponse.json({ success: false, message: 'Could not build the export.' }, { status: 500 });
    }

    const buffer = await wb.xlsx.writeBuffer();
    const scope = view === 'panels' ? 'panels' : round ? round.key : 'all-rounds';
    const filename = `VVITU_AI_Ready_Results_${year}_${scope}_${generated.replace(/[ :]/g, '-')}.xlsx`;
    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-store'
        }
    });
}
