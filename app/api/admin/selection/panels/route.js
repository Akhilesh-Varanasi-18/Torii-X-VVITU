import { NextResponse } from 'next/server';
import { isAuthenticated } from '../../../../../lib/dashboard-auth';
import { isValidYear } from '../../../../../lib/selection-results';
import { resolveLimit, PANEL_SORT_KEYS, PANEL_STATUSES, isValidDate } from '../../../../../lib/interview-panels';
import { panelOverview, listPanelists } from '../../../../../lib/interview-panels-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const STATUS_KEYS = PANEL_STATUSES.map((s) => s.key);

/**
 * GET ?year=&page=&limit=&q=&panel=&day=&branch=&status=&sort=
 *
 * One page of the interview schedule, plus everything the header needs: the
 * totals, the per-panel and per-day strips, the branch counts, the star
 * histogram and the panelist names for the "Scored by" dropdown.
 *
 * Only `students` is filtered and paged. The strips are always computed over
 * the whole year, so picking a panel narrows the table without blanking every
 * other panel's card — and so the page never has to ask twice.
 *
 * `limit` accepts 10 / 50 / 100 / 200, the same sizes as the coding-profiles
 * directory; anything else falls back to the default rather than erroring, so a
 * stale bookmark still renders.
 *
 * Identity only (§8.10) — no mobile numbers, no emails.
 */
export async function GET(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const year = params.get('year') || '';
    if (!isValidYear(year)) return NextResponse.json({ success: false, message: 'Pick an academic year.' }, { status: 400 });

    const day = params.get('day') || '';
    if (day && !isValidDate(day)) return NextResponse.json({ success: false, message: 'Bad day filter.' }, { status: 400 });

    const sortRaw = params.get('sort') || '';
    const statusRaw = params.get('status') || '';

    const opts = {
        q: String(params.get('q') || '').slice(0, 80),
        // Panel and branch are free-text labels that come from the data itself,
        // so they are length-capped and compared as plain strings rather than
        // validated against a list that would go stale the moment a panel is
        // renamed. An unknown value simply matches nothing.
        panel: String(params.get('panel') || '').slice(0, 60),
        branch: String(params.get('branch') || '').slice(0, 40),
        day,
        status: STATUS_KEYS.includes(statusRaw) ? statusRaw : 'all',
        sort: PANEL_SORT_KEYS.includes(sortRaw) ? sortRaw : 'slot',
        page: params.get('page'),
        limit: resolveLimit(params.get('limit'))
    };

    try {
        const [overview, panelists] = await Promise.all([panelOverview(year, opts), listPanelists(year)]);
        return NextResponse.json({ success: true, ...overview, panelists, sort: opts.sort, status: opts.status });
    } catch (error) {
        console.error('[admin/selection/panels] load failed:', error);
        return NextResponse.json({ success: false, message: 'Could not load the panel view.' }, { status: 500 });
    }
}
