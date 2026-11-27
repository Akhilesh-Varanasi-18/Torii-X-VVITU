import { NextResponse } from 'next/server';
import { isAuthenticated } from '../../../../../lib/dashboard-auth';
import { getRegistrationsCollection } from '../../../../../lib/mongodb';
import { buildQuery, resolveLimit, isFiltered } from '../../../../../lib/registrations-directory';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Identity and the figures the panel screens on. Contact details are included
// because this IS the registrations register — the same fields the Excel export
// has always carried — and the admin panel is passcode-gated and noindex
// (§8.10). Nothing here is reachable without a session.
const PROJECTION = {
    _id: 0,
    registrationId: 1,
    fullName: 1,
    rollNumber: 1,
    collegeEmail: 1,
    mobileNumber: 1,
    branch: 1,
    branchOther: 1,
    gender: 1,
    residenceType: 1,
    hasLaptop: 1,
    admissionType: 1,
    cgpa: 1,
    diplomaCgpa: 1,
    activeBacklogs: 1,
    eapcetRank: 1,
    jeeMainsRank: 1,
    jeeAdvancedRank: 1,
    yearLabel: 1,
    passoutYear: 1,
    programName: 1,
    status: 1,
    createdAt: 1
};

/**
 * GET ?program=&range=&q=&branch=&gender=&admission=&laptop=&sort=&page=&limit=
 *
 * One page of the registrations register.
 *
 * Paged in MongoDB with skip/limit rather than in Node: this collection is
 * 1,100+ documents and growing with every intake, and the whole point of the
 * page-size control is that choosing 10 costs ten rows of work, not a thousand.
 *
 * `counts` (branch and gender tallies) is computed over the CURRENT filter
 * minus that filter's own field, so the branch chips still show every branch
 * while one of them is selected — otherwise picking CSE would hide the way back
 * to the others.
 */
export async function GET(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const params = request.nextUrl.searchParams;
    const { match, sort, meta } = buildQuery(params);
    const limit = resolveLimit(params.get('limit'));
    const perPage = limit === 'all' ? 0 : limit;

    try {
        const collection = await getRegistrationsCollection();

        // The branch CHIPS ignore the branch filter so they stay navigable —
        // otherwise picking CSE hides every route back to the others. Their
        // "All" chip has to be counted the same way, or it reads 1,145 beside
        // chips that sum to 659.
        const branchMatch = { ...match };
        delete branchMatch.branch;

        const [total, scopeTotal, branchTotal, branchRows, genderRows] = await Promise.all([
            collection.countDocuments(match),
            // The unfiltered size of this program, for "N of M".
            collection.countDocuments(meta.program ? { programCode: meta.program.code } : {}),
            collection.countDocuments(branchMatch),
            collection.aggregate([{ $match: branchMatch }, { $group: { _id: '$branch', n: { $sum: 1 } } }, { $sort: { n: -1 } }]).toArray(),
            // Gender is a dropdown, not chips, so nothing needs it to stay
            // navigable — and counting it over the full filter is what stops
            // the header reading "Matching 659 · Female 659 · Male 486".
            collection.aggregate([{ $match: match }, { $group: { _id: '$gender', n: { $sum: 1 } } }]).toArray()
        ]);

        const pages = perPage ? Math.max(1, Math.ceil(total / perPage)) : 1;
        // Clamped, so narrowing a filter while deep in the list lands on the
        // last page that exists rather than on an empty one.
        const page = perPage ? Math.min(Math.max(1, Number(params.get('page')) || 1), pages) : 1;

        let cursor = collection.find(match, { projection: PROJECTION }).sort(sort);
        if (perPage) cursor = cursor.skip((page - 1) * perPage).limit(perPage);
        const students = await cursor.toArray();

        return NextResponse.json({
            success: true,
            students,
            total,
            scopeTotal,
            page,
            pages,
            limit,
            filtered: isFiltered(meta),
            filters: {
                program: meta.programCode,
                range: meta.range,
                q: meta.q,
                branch: meta.branch,
                gender: meta.gender,
                admission: meta.admission,
                laptop: meta.laptop,
                sort: meta.sort
            },
            counts: {
                branchTotal,
                branch: branchRows.map((r) => ({ value: r._id || '', n: r.n })),
                gender: genderRows.map((r) => ({ value: r._id || '', n: r.n }))
            }
        });
    } catch (error) {
        console.error('[admin/registrations/list] query failed:', error);
        return NextResponse.json({ success: false, message: 'Could not read registrations.' }, { status: 503 });
    }
}
