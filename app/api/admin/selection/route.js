import { NextResponse } from 'next/server';
import { isAuthenticated } from '../../../../lib/dashboard-auth';
import { isValidYear, isValidProgramCode, DEFAULT_PROGRAM_CODE, SELECTION_PROGRAMS } from '../../../../lib/selection-results';
import { listYears, yearSummary } from '../../../../lib/selection-results-store';
import { getRegistrationsCollection } from '../../../../lib/mongodb';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * The AI Ready Engineers results page's header: which academic years the hostel
 * roster holds, and for the selected one (`?year=`, defaulting to the newest)
 * how many students are on each round's list and how many interviews are scored.
 */
export async function GET(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    try {
        const years = await listYears();
        const asked = request.nextUrl.searchParams.get('year');
        if (asked && !isValidYear(asked)) {
            return NextResponse.json({ success: false, message: 'Invalid academic year.' }, { status: 400 });
        }
        const year = asked || years[0] || null;
        // The page is no longer AI Ready's alone: every figure below belongs to
        // one programme, and the catalogue travels with the response so the
        // picker does not need a second request to render.
        const code = request.nextUrl.searchParams.get('program') || DEFAULT_PROGRAM_CODE;
        if (!isValidProgramCode(code)) {
            return NextResponse.json({ success: false, message: 'Pick a programme.' }, { status: 400 });
        }
        const summary = year ? await yearSummary(year, code) : null;
        if (summary) {
            // The register is the first tab in the round strip, so its count
            // belongs in the same payload as the rounds' — one request, and the
            // tiles cannot disagree about which programme they are describing.
            summary.registrations = await (await getRegistrationsCollection()).countDocuments({ programCode: code });
        }
        return NextResponse.json({ success: true, years, year, program: code, programs: SELECTION_PROGRAMS, summary });
    } catch (error) {
        console.error('[admin/selection] summary failed:', error);
        return NextResponse.json({ success: false, message: 'Could not load the selection results.' }, { status: 500 });
    }
}
