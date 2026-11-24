import { NextResponse } from 'next/server';
import { isAuthenticated } from '../../../../lib/dashboard-auth';
import { isValidYear } from '../../../../lib/selection-results';
import { listYears, yearSummary } from '../../../../lib/selection-results-store';

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
        const summary = year ? await yearSummary(year) : null;
        return NextResponse.json({ success: true, years, year, summary });
    } catch (error) {
        console.error('[admin/selection] summary failed:', error);
        return NextResponse.json({ success: false, message: 'Could not load the selection results.' }, { status: 500 });
    }
}
