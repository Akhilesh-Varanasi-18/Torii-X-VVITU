import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { isAuthenticated } from '../../../../../../lib/dashboard-auth';
import { roundByKey, SELECTION_ROUNDS } from '../../../../../../lib/selection-results';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Brand palette — hex because ExcelJS wants ARGB, not CSS vars (same values as
// the registrations export).
const CORAL = 'FFE2544C';
const HEADER_TEXT = 'FFFFFFFF';
const STRIPE = 'FFFFF3EF';
const MUTED = 'FF64748B';

/**
 * GET ?round= — a sample workbook showing the format a round's list should be
 * sent in. Generated rather than shipped from public/ because .gitignore blocks
 * every .xlsx (§8.10), and generating it keeps the headers in step with what
 * readRollInput() actually recognises.
 *
 * The data sheet is FIRST on purpose: the upload reader takes the first sheet
 * with rows, so a filled-in copy of this template uploads as-is. The sample rows
 * use roll numbers that cannot exist on the roster ("SAMPLE…"), so if someone
 * forgets to delete them they are reported as "not on the hostel roster" and
 * skipped — never written.
 */
export async function GET(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const round = roundByKey(request.nextUrl.searchParams.get('round') || '') || SELECTION_ROUNDS[0];

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ToriiMinds';
    wb.created = new Date();

    const ws = wb.addWorksheet(round.short.slice(0, 31), { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
        { header: 'S.No', key: 'sno', width: 7 },
        { header: 'Roll No', key: 'roll', width: 20, style: { numFmt: '@' } },
        { header: 'Student Name', key: 'name', width: 30 },
        { header: 'Branch', key: 'branch', width: 12 }
    ];
    const head = ws.getRow(1);
    head.height = 22;
    head.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: HEADER_TEXT }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORAL } };
        cell.alignment = { vertical: 'middle' };
    });

    const samples = [
        ['SAMPLE0001', 'Sample Student One', 'CSE'],
        ['SAMPLE0002', 'Sample Student Two', 'ECE'],
        ['SAMPLE0003', 'Sample Student Three', 'AIML']
    ];
    samples.forEach(([roll, name, branch], i) => {
        const row = ws.addRow({ sno: i + 1, roll, name, branch });
        row.font = { italic: true, color: { argb: MUTED } };
        if (i % 2) row.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE } }));
    });

    const help = wb.addWorksheet('How to fill');
    help.getColumn(1).width = 100;
    [
        [`${round.label} — list format`, { bold: true, size: 14, color: { argb: CORAL } }],
        [`This list should hold: ${round.listOf}.`],
        [''],
        ['• Only the "Roll No" column is required. S.No, Student Name and Branch are for your reference and are not read.'],
        ['• The header may also be "Roll Number", "Regd No", "Reg No" or "Hall Ticket No".'],
        ['• One student per row. Repeated roll numbers are counted once.'],
        ['• Delete the three grey SAMPLE rows before uploading (if left in, they are skipped as "not on the roster").'],
        ['• Keep the list on the FIRST sheet. Save as .xlsx — a .csv with the same columns also works.'],
        ['• Only students on the hostel roster for the selected academic year are recorded; the preview lists anyone else.']
    ].forEach(([text, font]) => {
        const row = help.addRow([text]);
        if (font) row.font = font;
        row.alignment = { wrapText: true, vertical: 'top' };
    });

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="AI_Ready_${round.key}_list_template.xlsx"`,
            'Cache-Control': 'no-store'
        }
    });
}
