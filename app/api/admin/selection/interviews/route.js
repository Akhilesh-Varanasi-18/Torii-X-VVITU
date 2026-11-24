import { NextResponse } from 'next/server';
import { isAuthenticated } from '../../../../../lib/dashboard-auth';
import { isValidYear, isValidScore, normaliseRoll, isValidRemarks, MAX_REMARKS } from '../../../../../lib/selection-results';
import { MAX_PANELIST } from '../../../../../lib/interview-panels';
import { interviewCandidates, saveInterviewScore } from '../../../../../lib/selection-results-store';
import { listPanelists } from '../../../../../lib/interview-panels-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET ?year= — everyone on that year's interview list with any stars given and
 * the slot they were timetabled to, plus the panelist names the "Scored by"
 * dropdown offers. One request: the page needs all three together before it can
 * render a score card, and three round trips would only let them disagree.
 */
export async function GET(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const year = request.nextUrl.searchParams.get('year') || '';
    if (!isValidYear(year)) return NextResponse.json({ success: false, message: 'Pick an academic year.' }, { status: 400 });
    try {
        const [students, panelists] = await Promise.all([interviewCandidates(year), listPanelists(year)]);
        return NextResponse.json({ success: true, year, students, panelists });
    } catch (error) {
        console.error('[admin/selection/interviews] list failed:', error);
        return NextResponse.json({ success: false, message: 'Could not load the interview list.' }, { status: 500 });
    }
}

/**
 * PUT { year, rollKey, coding, communication, remarks?, scoredBy? } — save one
 * student's interview stars (1-5 each), optionally the panel's written remarks,
 * and who took the interview. Saving again overwrites; the panel can correct a
 * score, a remark or the name. Sending an empty `remarks` clears one written
 * earlier.
 *
 * `scoredBy` is a free-text name rather than an id because there are no user
 * accounts — the page offers the panelists already on the timetable and
 * pre-selects the one this student was allocated to.
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
    // 2 KB covered stars alone; remarks add up to MAX_REMARKS characters, and JSON
    // escaping can inflate those well past their character count.
    if (raw.length > 8192) return NextResponse.json({ success: false, message: 'Request too large.' }, { status: 413 });
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
    const remarks = body?.remarks;
    const scoredBy = body?.scoredBy;

    if (!isValidYear(year)) return NextResponse.json({ success: false, message: 'Pick an academic year.' }, { status: 400 });
    if (!rollKey) return NextResponse.json({ success: false, message: 'Pick a student.' }, { status: 400 });
    if (!isValidScore(coding) || !isValidScore(communication)) {
        return NextResponse.json({ success: false, message: 'Give both scores, 1 to 5 stars each.' }, { status: 400 });
    }
    // Remarks stay optional — only an over-long one is refused, and it says by
    // how much rather than making the panel count characters themselves.
    if (!isValidRemarks(remarks)) {
        return NextResponse.json(
            { success: false, message: `Remarks can be at most ${MAX_REMARKS} characters.` },
            { status: 400 }
        );
    }
    if (scoredBy !== undefined && scoredBy !== null && (typeof scoredBy !== 'string' || scoredBy.trim().length > MAX_PANELIST)) {
        return NextResponse.json({ success: false, message: `That name is too long (limit ${MAX_PANELIST}).` }, { status: 400 });
    }

    try {
        const score = await saveInterviewScore({ year, rollKey, coding, communication, remarks, scoredBy });
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
