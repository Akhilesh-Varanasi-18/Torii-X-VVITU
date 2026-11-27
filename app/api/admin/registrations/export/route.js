import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { getRegistrationsCollection } from '../../../../../lib/mongodb';
import { isAuthenticated } from '../../../../../lib/dashboard-auth';
import { resolveRange, rangeMatch, IST_TZ } from '../../../../../lib/analytics-range';
import { PROGRAM_BY_KEY } from '../../../../../lib/registration-schema';
import { buildQuery, branchShort, isFiltered } from '../../../../../lib/registrations-directory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Brand palette — kept in hex (ExcelJS wants ARGB) rather than CSS vars.
const CORAL = 'FFE2544C';
const HEADER_TEXT = 'FFFFFFFF';
const STRIPE = 'FFFFF3EF';

const COLUMNS = [
    { header: 'Registration ID', key: 'registrationId', width: 18 },
    { header: 'Full Name', key: 'fullName', width: 26 },
    { header: 'Roll Number', key: 'rollNumber', width: 16 },
    { header: 'College Email', key: 'collegeEmail', width: 32 },
    { header: 'Mobile Number', key: 'mobileNumber', width: 16 },
    { header: 'Branch', key: 'branch', width: 44 },
    // Only filled when the student picked "my branch is not listed" and typed
    // their own; blank for everyone else.
    { header: 'Branch (typed)', key: 'branchOther', width: 32 },
    { header: 'Gender', key: 'gender', width: 10 },
    { header: 'Residence', key: 'residenceType', width: 14 },
    { header: 'Has Laptop', key: 'hasLaptop', width: 12 },
    // { header: 'CRT Fee Paid', key: 'paidCrtFee', width: 13 }, // CRT retired
    // Moon Coder academics (blank for programs that did not collect them).
    { header: 'Overall CGPA', key: 'cgpa', width: 13 },
    { header: 'Active Backlogs', key: 'activeBacklogs', width: 15 },
    // Lateral-entry students report a diploma CGPA instead of 1st-year marks;
    // kept in its own column so the two scales are never averaged together.
    { header: 'Admission Type', key: 'admissionType', width: 16 },
    { header: 'Diploma CGPA', key: 'diplomaCgpa', width: 14 },
    { header: 'SkillUp Batch', key: 'batch', width: 14 },
    // Only Moon Coder writes this — it is the one intake open to every year, so
    // the column is blank for everyone else, whose passout year is fixed by
    // which program they joined.
    { header: 'Current Year', key: 'studyYear', width: 14 },
    { header: 'Time Slot', key: 'timeSlot', width: 20 },
    // Pre-fill audit: which roster entry the form was filled from and what the
    // student changed before confirming.
    { header: 'Prefilled From', key: 'prefilledFrom', width: 16 },
    { header: 'Edited Fields', key: 'editedFields', width: 28 },
    // Entrance ranks were collected only for the 2030 (1st-year) intake.
    { header: 'EAPCET Rank', key: 'eapcetRank', width: 14 },
    { header: 'JEE Mains Rank', key: 'jeeMainsRank', width: 15 },
    { header: 'JEE Advanced Rank', key: 'jeeAdvancedRank', width: 17 },
    { header: 'Passout Year', key: 'passoutYear', width: 13 },
    { header: 'Year / Batch', key: 'yearLabel', width: 22 },
    { header: 'Program', key: 'programName', width: 20 },
    { header: 'Program Code', key: 'programCode', width: 14 },
    { header: 'Track', key: 'programTrack', width: 22 },
    { header: 'Status', key: 'status', width: 13 },
    { header: 'Registered At (IST)', key: 'registeredAt', width: 22 }
];

const RANGE_LABEL = { all: 'All time', today: 'Today', '7d': 'Last 7 days', '30d': 'Last 30 days' };

/** Formats a Date as 'YYYY-MM-DD HH:mm' in IST for human-readable cells/filenames. */
function formatIST(date) {
    if (!date) return '';
    const shifted = new Date(date.getTime() + 330 * 60 * 1000);
    return shifted.toISOString().slice(0, 16).replace('T', ' ');
}

export async function GET(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const now = new Date();

    // `view=directory` means "the rows I am looking at": the registrations tab
    // sends its own filters and the sheet must match them exactly, or Export
    // quietly hands back a different population than the screen showed.
    const directory = params.get('view') === 'directory';
    const built = directory ? buildQuery(params, { now }) : null;

    // The analytics page's older contract: ?range= and ?program= only.
    const range = resolveRange(params.get('range'));
    const program = directory ? built.meta.program : PROGRAM_BY_KEY[params.get('program')] || null;
    const match = directory ? built.match : { ...rangeMatch(range), ...(program ? { programCode: program.code } : {}) };
    const sort = directory ? built.sort : { createdAt: -1 };

    let rows;
    try {
        const collection = await getRegistrationsCollection();
        rows = await collection.find(match).sort(sort).toArray();
    } catch (error) {
        console.error('[export] query failed:', error);
        return NextResponse.json({ success: false, message: 'Could not read registrations.' }, { status: 503 });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ToriiMinds × VVITU';
    workbook.created = now;
    const sheet = workbook.addWorksheet('Registrations', {
        views: [{ state: 'frozen', ySplit: 3 }]
    });

    // ── Title band (rows 1-2) ──
    sheet.mergeCells(1, 1, 1, COLUMNS.length);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = 'ToriiMinds × VVITU — Registrations Report';
    titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: CORAL } };
    titleCell.alignment = { vertical: 'middle' };
    sheet.getRow(1).height = 24;

    sheet.mergeCells(2, 1, 2, COLUMNS.length);
    const metaCell = sheet.getCell(2, 1);
    // Spell the filters out on the sheet. A workbook outlives the screen it was
    // taken from, and "327 registrations" means nothing six weeks later if
    // nobody can tell which 327.
    const m = built ? built.meta : null;
    const applied = m
        ? [
              m.q ? `search "${m.q}"` : null,
              m.branch ? `branch ${branchShort(m.branch)}` : null,
              m.gender ? `gender ${m.gender}` : null,
              m.admission ? `admission ${m.admission}` : null,
              m.laptop ? `laptop ${m.laptop}` : null,
              m.range !== 'all' ? RANGE_LABEL[m.range] : null
          ].filter(Boolean)
        : [];
    metaCell.value = [
        `Program: ${program ? program.programName : 'All programs'}`,
        directory ? (applied.length ? `Filters: ${applied.join(', ')}` : 'Filters: none') : `Filter: ${RANGE_LABEL[range.key]}`,
        `${rows.length} registration(s)`,
        `Generated ${formatIST(now)} IST`
    ].join('   •   ');
    metaCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF64748B' } };
    metaCell.alignment = { vertical: 'middle' };

    // ── Header row (row 3) ──
    sheet.columns = COLUMNS.map((c) => ({ key: c.key, width: c.width }));
    const headerRow = sheet.getRow(3);
    COLUMNS.forEach((col, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = col.header;
        cell.font = { bold: true, color: { argb: HEADER_TEXT }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORAL } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = { bottom: { style: 'thin', color: { argb: CORAL } } };
    });
    headerRow.height = 20;

    // ── Data rows ──
    rows.forEach((doc, index) => {
        const row = sheet.addRow({
            registrationId: doc.registrationId || '',
            fullName: doc.fullName || '',
            rollNumber: doc.rollNumber || '',
            collegeEmail: doc.collegeEmail || '',
            mobileNumber: doc.mobileNumber || '',
            branch: doc.branch || '',
            gender: doc.gender || '',
            residenceType: doc.residenceType || '',
            hasLaptop: doc.hasLaptop || '',
            cgpa: typeof doc.cgpa === 'number' ? doc.cgpa : '',
            activeBacklogs: typeof doc.activeBacklogs === 'number' ? doc.activeBacklogs : '',
            batch: doc.batch || '',
            timeSlot: doc.timeSlot || '',
            prefilledFrom: doc.prefill?.rollKey ? `SkillUp (${doc.prefill.rollKey})` : '',
            editedFields: Array.isArray(doc.prefill?.editedFields) ? doc.prefill.editedFields.join(', ') : '',
            eapcetRank: doc.eapcetRank || '',
            jeeMainsRank: doc.jeeMainsRank || '',
            jeeAdvancedRank: doc.jeeAdvancedRank || '',
            passoutYear: doc.passoutYear || '',
            yearLabel: doc.yearLabel || '',
            programName: doc.programName || '',
            programCode: doc.programCode || '',
            programTrack: doc.programTrack || '',
            status: doc.status || '',
            registeredAt: formatIST(doc.createdAt)
        });
        if (index % 2 === 1) {
            row.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE } };
            });
        }
    });

    sheet.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: COLUMNS.length } };

    const buffer = await workbook.xlsx.writeBuffer();
    const scope = directory ? (isFiltered(built.meta) ? 'filtered' : 'all') : range.key;
    const filename = `VVITU_Registrations_${program ? `${program.key}_` : ''}${scope}_${formatIST(now).replace(/[ :]/g, '-')}.xlsx`;

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Cache-Control': 'no-store'
        }
    });
}
