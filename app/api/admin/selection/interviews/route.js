import { NextResponse } from 'next/server';
import { isAuthenticated } from '../../../../../lib/dashboard-auth';
import { isValidYear, isValidScore, normaliseRoll } from '../../../../../lib/selection-results';
import { interviewCandidates, saveInterviewScore } from '../../../../../lib/selection-results-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** GET ?year= — everyone on that year's interview list, with any stars given. */
export async function GET(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const year = request.nextUrl.searchParams.get('year') || '';
    if (!isValidYear(year)) return NextResponse.json({ success: false, message: 'Pick an academic year.' }, { status: 400 });
    try {
        const students = await interviewCandidates(year);
        return NextResponse.json({ success: true, year, students });
    } catch (error) {
        console.error('[admin/selection/interviews] list failed:', error);
        return NextResponse.json({ success: false, message: 'Could not load the interview list.' }, { status: 500 });
    }
}

/**
 * PUT { year, rollKey, coding, communication } — save one student's interview
 * stars (1-5 each). Saving again overwrites; the panel can correct a score.
 */
export async function PUT(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const origin = request.headers.get('origin');
    if (origin && new URL(origin).host !== request.headers.get('host')) {
        return NextResponse.json({ success: false, message: 'Bad origin.' }, { status: 403 });
    }

    const raw = await request.text();
    if (raw.length > 2048) return NextResponse.json({ success: false, message: 'Request too large.' }, { status: 413 });
    let body;
    try {
        body = JSON.parse(raw);
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid request.' }, { status: 400 });
    }

    const year = String(body?.year || '');
    const rollKey = normaliseRoll(body?.rollKey);
    const coding = Number(body?.coding);
    const communication = Number(body?.communication);

    if (!isValidYear(year)) return NextResponse.json({ success: false, message: 'Pick an academic year.' }, { status: 400 });
    if (!rollKey) return NextResponse.json({ success: false, message: 'Pick a student.' }, { status: 400 });
    if (!isValidScore(coding) || !isValidScore(communication)) {
        return NextResponse.json({ success: false, message: 'Give both scores, 1 to 5 stars each.' }, { status: 400 });
    }

    try {
        const score = await saveInterviewScore({ year, rollKey, coding, communication });
        if (!score) {
            return NextResponse.json(
                { success: false, message: `That student is not on the ${year} interview list.` },
                { status: 404 }
            );
        }
        return NextResponse.json({ success: true, rollKey, score });
    } catch (error) {
        console.error('[admin/selection/interviews] save failed:', error);
        return NextResponse.json({ success: false, message: 'Could not save the score.' }, { status: 500 });
    }
}
