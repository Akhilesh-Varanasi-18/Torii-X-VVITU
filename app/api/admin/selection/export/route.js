import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { isAuthenticated } from '../../../../../lib/dashboard-auth';
import {
    isValidYear,
    roundByKey,
    SELECTION_ROUNDS,
    INTERVIEW_ROUND,
    MAX_STARS,
    isValidProgramCode,
    DEFAULT_PROGRAM_CODE,
    programByCode,
    normaliseRoll
} from '../../../../../lib/selection-results';
import { roundStudents } from '../../../../../lib/selection-results-store';
import { panelOverview } from '../../../../../lib/interview-panels-store';
import { formatDate, formatSlot } from '../../../../../lib/interview-panels';
import { getRegistrationsCollection } from '../../../../../lib/mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Brand palette — hex because ExcelJS wants ARGB, not CSS vars (same values as
// the registrations export and the list template).
const CORAL = 'FFE2544C';
const AMBER = 'FFF2A63B';
const HEADER_TEXT = 'FFFFFFFF';
const STRIPE = 'FFFFF3EF';
const MUTED = 'FF64748B';
const BORDER = 'FFE2E8F0';

/** 'YYYY-MM-DD HH:mm' in IST. Vercel runs in UTC, so the offset is explicit (§8.8). */
function formatIST(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    return new Date(d.getTime() + 330 * 60 * 1000).toISOString().slice(0, 16).replace('T', ' ');
}

// §8.5: department columns carry the short code with no ampersand.
const branchCell = (b) => String(b || '').replace(/&/g, '');

/** The full option string ends in its code — "…(AIML)" — which is all a column needs. */
function branchShort(option) {
    if (!option) return '';
    const m = String(option).match(/\(([^)]+)\)\s*$/);
    return branchCell(m ? m[1] : option);
}

/**
 * Lay out one styled sheet: a title band (row 1), a meta line (row 2), the coral
 * header (row 3), striped data rows, frozen header and an autofilter — the same
 * shape as the registrations export so every workbook reads as one family.
 */
function addSheet(wb, name, { title, meta, columns, rows }) {
    const ws = wb.addWorksheet(name.slice(0, 31), { views: [{ state: 'frozen', xSplit: 2, ySplit: 3 }] });

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
    m.alignment = { vertical: 'middle' };
    ws.getRow(2).height = 16;

    ws.columns = columns.map((c) => ({ key: c.key, width: c.width, style: c.style }));
    const head = ws.getRow(3);
    columns.forEach((c, i) => {
        const cell = head.getCell(i + 1);
        cell.value = c.header;
        cell.font = { bold: true, color: { argb: HEADER_TEXT }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c.accent ? AMBER : CORAL } };
        cell.alignment = { vertical: 'middle', horizontal: c.center ? 'center' : 'left', wrapText: true };
    });
    head.height = 26;

    rows.forEach((data, i) => {
        const row = ws.addRow(data);
        row.alignment = { vertical: 'top' };
        columns.forEach((c, j) => {
            const cell = row.getCell(j + 1);
            if (c.center) cell.alignment = { vertical: 'top', horizontal: 'center' };
            cell.border = { bottom: { style: 'hair', color: { argb: BORDER } } };
        });
        if (i % 2 === 1) {
            row.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE } };
            });
        }
    });

    if (rows.length) {
        ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: columns.length } };
    } else {
        const empty = ws.addRow({});
        empty.getCell(1).value = 'No students on this list yet.';
        empty.getCell(1).font = { italic: true, color: { argb: MUTED } };
    }
    return ws;
}

// ── Columns ─────────────────────────────────────────────────────────────────
//
// Every sheet carries the SAME student columns. The point of the workbook is
// that a round sheet is not a shortened list of names: if the Demo tab shows
// ten students, the Demo sheet holds those ten students' whole registration —
// contact, branch, academics, ranks — so nobody has to cross-reference it
// against the register by hand.

const IDENTITY = [
    { header: 'S.No', key: 'sno', width: 6, center: true },
    // Text format: a roll number is an identifier, and Excel would otherwise
    // happily turn an all-digit one into 2.3E+13.
    { header: 'Roll Number', key: 'rollNumber', width: 17, style: { numFmt: '@' } },
    { header: 'Student Name', key: 'fullName', width: 28 },
    { header: 'Registration ID', key: 'registrationId', width: 16 },
    { header: 'College Email', key: 'collegeEmail', width: 30 },
    { header: 'Mobile Number', key: 'mobileNumber', width: 15, style: { numFmt: '@' } },
    { header: 'Branch', key: 'branch', width: 10, center: true },
    { header: 'Branch (typed)', key: 'branchOther', width: 24 },
    { header: 'Gender', key: 'gender', width: 9, center: true },
    { header: 'Residence', key: 'residenceType', width: 12 },
    { header: 'Laptop', key: 'hasLaptop', width: 8, center: true },
    { header: 'Admission', key: 'admissionType', width: 13 },
    { header: 'CGPA', key: 'cgpa', width: 8, center: true },
    { header: 'Diploma CGPA', key: 'diplomaCgpa', width: 13, center: true },
    { header: 'Backlogs', key: 'activeBacklogs', width: 9, center: true },
    { header: 'EAPCET Rank', key: 'eapcetRank', width: 13, center: true },
    { header: 'JEE Mains Rank', key: 'jeeMainsRank', width: 15, center: true },
    { header: 'JEE Adv Rank', key: 'jeeAdvancedRank', width: 14, center: true },
    { header: 'Year / Batch', key: 'yearLabel', width: 20 },
    { header: 'Registered At (IST)', key: 'registeredAt', width: 19 }
];

const LIST_COLUMN = { header: 'Added to List (IST)', key: 'addedAt', width: 19, accent: true };

const INTERVIEW_COLUMNS = [
    { header: 'Panel', key: 'panel', width: 11, accent: true },
    { header: 'Panelist', key: 'panelist', width: 13, accent: true },
    { header: 'Interview Date', key: 'ivDate', width: 16, accent: true },
    { header: 'Slot', key: 'slot', width: 17, accent: true },
    { header: `Coding (/${MAX_STARS})`, key: 'coding', width: 11, center: true, accent: true },
    { header: `Communication (/${MAX_STARS})`, key: 'communication', width: 17, center: true, accent: true },
    { header: `Total (/${MAX_STARS * 2})`, key: 'total', width: 11, center: true, accent: true },
    { header: 'Scored By', key: 'scoredBy', width: 13, accent: true },
    { header: 'Remarks', key: 'remarks', width: 52, accent: true, style: { alignment: { wrapText: true, vertical: 'top' } } }
];

/** A blank, not a zero: nobody gave this number, which is not the same as 0 (§6.2). */
const num = (v) => (v === null || v === undefined || v === '' ? '' : v);

/** One student's registration fields, whether or not a registration exists. */
function studentCells(reg, fallback, i) {
    return {
        sno: i + 1,
        rollNumber: reg?.rollNumber || fallback?.rollNo || '',
        fullName: reg?.fullName || fallback?.name || '',
        registrationId: reg?.registrationId || '',
        collegeEmail: reg?.collegeEmail || '',
        mobileNumber: reg?.mobileNumber || '',
        // Prefer the registration's own branch; fall back to the roster's code
        // for a student who is on a list but never registered.
        branch: reg ? branchShort(reg.branch) : branchCell(fallback?.branch || ''),
        branchOther: reg?.branchOther || '',
        gender: reg?.gender || fallback?.gender || '',
        residenceType: reg?.residenceType || '',
        hasLaptop: reg?.hasLaptop || '',
        admissionType: reg?.admissionType || '',
        cgpa: num(reg?.cgpa),
        diplomaCgpa: num(reg?.diplomaCgpa),
        activeBacklogs: num(reg?.activeBacklogs),
        eapcetRank: num(reg?.eapcetRank),
        jeeMainsRank: num(reg?.jeeMainsRank),
        jeeAdvancedRank: num(reg?.jeeAdvancedRank),
        yearLabel: reg?.yearLabel || '',
        registeredAt: formatIST(reg?.createdAt)
    };
}

/**
 * GET ?year=&program=[&round=|&view=panels]
 *
 *   no round / view  EVERY TAB AS A SHEET: Registrations first, then Demo,
 *                    Round 1-3, Interview and Final — one sheet per tab on the
 *                    page, each holding the full registration record of the
 *                    students on that list.
 *   round=<key>      that one round's sheet.
 *   view=panels      the interview sheet only (what the panel view downloads).
 *
 * Contact details are included: this is the internal workbook the team already
 * had, and the admin panel is passcode-gated and noindex (§8.10).
 */
export async function GET(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const year = params.get('year') || '';
    if (!isValidYear(year)) return NextResponse.json({ success: false, message: 'Pick an academic year.' }, { status: 400 });

    const code = params.get('program') || DEFAULT_PROGRAM_CODE;
    if (!isValidProgramCode(code)) return NextResponse.json({ success: false, message: 'Pick a programme.' }, { status: 400 });
    const programName = programByCode(code)?.name || code;

    const roundKey = params.get('round') || '';
    const round = roundKey ? roundByKey(roundKey) : null;
    if (roundKey && !round) return NextResponse.json({ success: false, message: 'Unknown round.' }, { status: 400 });

    const view = params.get('view') || '';
    if (view && view !== 'panels') return NextResponse.json({ success: false, message: 'Unknown view.' }, { status: 400 });

    const now = new Date();
    const generated = formatIST(now);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ToriiMinds × VVITU';
    wb.created = now;

    try {
        // Every registration for this programme, once, keyed by roll. The round
        // lists live on the hostel roster and carry only identity, so this is
        // the join that turns "ten names" into "ten students".
        const regs = await (await getRegistrationsCollection()).find({ programCode: code }).sort({ createdAt: -1 }).toArray();
        const byRoll = new Map(regs.map((r) => [normaliseRoll(r.rollNumber), r]));

        const meta = (parts) => [`Programme: ${programName}`, `Year: ${year}`, ...parts, `Generated ${generated} IST`].join('   •   ');

        // Interview rows need the panel, the slot and the score, which live on
        // the allocation rather than the round list.
        let panelByRoll = new Map();
        const needsPanels = view === 'panels' || !round || round.key === INTERVIEW_ROUND;
        if (needsPanels) {
            const overview = await panelOverview(year, code);
            panelByRoll = new Map(overview.students.map((s) => [normaliseRoll(s.rollNo), s]));
        }

        const interviewCells = (rollKey) => {
            const p = panelByRoll.get(rollKey);
            const a = p?.allocation;
            const sc = p?.score;
            return {
                panel: a?.panel || '',
                panelist: a?.panelist || '',
                ivDate: a?.date ? formatDate(a.date, { withYear: true }) : '',
                slot: a ? formatSlot(a.start, a.end) : '',
                coding: sc ? sc.coding : '',
                communication: sc ? sc.communication : '',
                total: sc ? sc.total : '',
                scoredBy: sc?.scoredBy || '',
                remarks: sc?.remarks || ''
            };
        };

        /** One round's sheet, with every student's full registration beside them. */
        const addRoundSheet = async (def) => {
            const students = await roundStudents(year, code, def.key);
            const isInterview = def.key === INTERVIEW_ROUND;
            const columns = [...IDENTITY, ...(isInterview ? INTERVIEW_COLUMNS : []), LIST_COLUMN];
            const scored = isInterview ? students.filter((s) => s.score).length : 0;
            addSheet(wb, def.short, {
                title: `${programName} ${year} — ${def.label}`,
                meta: meta([`${students.length} student(s)`, isInterview ? `${scored} scored` : null, def.listOf].filter(Boolean)),
                columns,
                rows: students.map((s, i) => {
                    const rk = normaliseRoll(s.rollNo);
                    return {
                        ...studentCells(byRoll.get(rk), s, i),
                        ...(isInterview ? interviewCells(rk) : {}),
                        addedAt: formatIST(s.addedAt)
                    };
                })
            });
        };

        if (view === 'panels') {
            await addRoundSheet(roundByKey(INTERVIEW_ROUND));
        } else if (round) {
            await addRoundSheet(round);
        } else {
            // The whole page, tab by tab: Registrations, then every round.
            addSheet(wb, 'Registrations', {
                title: `${programName} ${year} — Registrations`,
                meta: meta([`${regs.length} registration(s)`, 'Everyone who signed up for this intake']),
                columns: IDENTITY,
                rows: regs.map((r, i) => studentCells(r, null, i))
            });
            for (const def of SELECTION_ROUNDS) await addRoundSheet(def);
        }
    } catch (error) {
        console.error('[admin/selection/export] failed:', error);
        return NextResponse.json({ success: false, message: 'Could not build the export.' }, { status: 500 });
    }

    const buffer = await wb.xlsx.writeBuffer();
    const scope = view === 'panels' ? 'interview' : round ? round.key : 'all-tabs';
    const filename = `VVITU_${code}_${year}_${scope}_${generated.replace(/[ :]/g, '-')}.xlsx`;

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-store'
        }
    });
}
