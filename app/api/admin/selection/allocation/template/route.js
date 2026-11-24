import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { isAuthenticated } from '../../../../../../lib/dashboard-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Brand palette — hex because ExcelJS wants ARGB, not CSS vars (same values as
// the other generated workbooks).
const CORAL = 'FFE2544C';
const HEADER_TEXT = 'FFFFFFFF';
const STRIPE = 'FFFFF3EF';
const MUTED = 'FF64748B';

/**
 * GET — a sample allocation workbook showing the format the upload expects.
 *
 * Generated rather than shipped from public/ because .gitignore blocks every
 * .xlsx (§8.10), and generating it keeps the headers in step with what
 * readAllocationInput() actually recognises.
 *
 * The data sheet is FIRST because the reader takes the first sheet with rows,
 * so a filled-in copy uploads as-is. The sample rolls start "SAMPLE" so that if
 * someone forgets to delete them they come back as "not on the hostel roster"
 * and are skipped, never written.
 */
export async function GET(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ToriiMinds';
    wb.created = new Date();

    const ws = wb.addWorksheet('Allocation', { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = [
        { header: 'Roll No', key: 'roll', width: 18, style: { numFmt: '@' } },
        { header: 'Student Name', key: 'name', width: 30 },
        { header: 'Panel', key: 'panel', width: 12 },
        { header: 'Panelist', key: 'panelist', width: 14 },
        { header: 'Date', key: 'date', width: 13, style: { numFmt: '@' } },
        { header: 'Start Time', key: 'start', width: 11, style: { numFmt: '@' } },
        { header: 'End Time', key: 'end', width: 11, style: { numFmt: '@' } },
        { header: 'Meeting Link', key: 'link', width: 46 }
    ];

    const head = ws.getRow(1);
    head.eachCell((c) => {
        c.font = { bold: true, color: { argb: HEADER_TEXT }, size: 11 };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORAL } };
        c.alignment = { vertical: 'middle' };
    });
    head.height = 20;

    const samples = [
        { roll: 'SAMPLE0000001', name: 'Delete this row', panel: 'Panel 1', panelist: 'Rahul', date: '2026-11-23', start: '16:00', end: '16:15', link: 'teams.microsoft.com/meet/…' },
        { roll: 'SAMPLE0000002', name: 'Delete this row', panel: 'Panel 1', panelist: 'Rahul', date: '2026-11-23', start: '16:15', end: '16:30', link: 'teams.microsoft.com/meet/…' },
        { roll: 'SAMPLE0000003', name: 'Delete this row', panel: 'Panel 2', panelist: 'Chaitanya', date: '2026-11-23', start: '16:00', end: '16:15', link: 'teams.microsoft.com/meet/…' }
    ];
    samples.forEach((s, i) => {
        const row = ws.addRow(s);
        if (i % 2 === 1) row.eachCell((c) => (c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STRIPE } }));
    });

    // Notes on a second sheet, so the first stays a clean table the reader can
    // take as-is.
    const notes = wb.addWorksheet('How to fill this in');
    notes.columns = [{ width: 110 }];
    const lines = [
        ['AI Ready Engineers — interview panel allocation', true],
        ['', false],
        ['Roll No is the only required column. It must match the hostel roster exactly; anything else is reported back and skipped.', false],
        ['', false],
        ['Panel is a free-text label, not a fixed list. Use whatever the timetable calls it — "Panel 1", "Pilot 2", "Room A".', false],
        ['Two sessions that both call themselves "Panel 1" but are run by different people should be labelled differently,', false],
        ['otherwise their students are counted as one panel and the averages mix.', false],
        ['', false],
        ['Date: write 2026-11-23, or 23/11/2026, or 23 Nov 2026. Always include the year.', false],
        ['', false],
        ['Start Time / End Time: 24-hour (16:00) or with the meridiem (4:00 PM). A bare "4:00" is read as 4 in the MORNING —', false],
        ['the preview flags anything before 08:00 so you can catch it before committing.', false],
        ['A single "Time" column holding the whole range ("4:00-4:15 PM") works too.', false],
        ['', false],
        ['Meeting Link is optional and is shown to the panel, never to students.', false],
        ['', false],
        ['Replace vs Add: Replace makes this sheet the whole timetable and clears a slot for anyone not in it.', false],
        ['Add only ever adds or updates. Neither one touches scores that have already been recorded.', false]
    ];
    lines.forEach(([text, bold]) => {
        const row = notes.addRow([text]);
        row.getCell(1).font = bold
            ? { name: 'Calibri', size: 13, bold: true, color: { argb: CORAL } }
            : { name: 'Calibri', size: 11, color: { argb: MUTED } };
    });

    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="VVITU_Interview_Allocation_Template.xlsx"',
            'Cache-Control': 'no-store'
        }
    });
}
