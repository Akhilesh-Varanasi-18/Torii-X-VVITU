import { NextResponse } from 'next/server';
import { isAuthenticated } from '../../../../../lib/dashboard-auth';
import { isValidYear, roundByKey, UPLOAD_MODES } from '../../../../../lib/selection-results';
import { readRollInput, planRoundUpload, applyRoundUpload, publicPlan, roundStudents } from '../../../../../lib/selection-results-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Same guard as the coding uploads: Vercel refuses bodies over ~4.5 MB at the
// edge, so anything larger would fail there with a less useful message.
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_TEXT = 200_000; // ~14k roll numbers; the whole roster is ~1,400

/**
 * GET ?year=&round= — the students currently on that round's list (what opens
 * when a round tile is clicked on the results page).
 */
export async function GET(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const year = request.nextUrl.searchParams.get('year') || '';
    const round = request.nextUrl.searchParams.get('round') || '';
    if (!isValidYear(year)) return NextResponse.json({ success: false, message: 'Pick an academic year.' }, { status: 400 });
    if (!roundByKey(round)) return NextResponse.json({ success: false, message: 'Pick a round.' }, { status: 400 });
    try {
        const students = await roundStudents(year, round);
        return NextResponse.json({ success: true, year, round, students });
    } catch (error) {
        console.error('[admin/selection/rounds] list failed:', error);
        return NextResponse.json({ success: false, message: 'Could not load that list.' }, { status: 500 });
    }
}

/**
 * Upload the list of roll numbers for one selection round of one academic year.
 *
 * Two-phase, like the coding captures: `?dryRun=1` parses, matches against the
 * roster and returns the preview (who is added, who comes off, who could not be
 * found, who is missing from the previous round) without writing. The page then
 * re-sends the SAME input without the flag to commit. The plan is recomputed on
 * commit rather than trusted from the client, so a tampered preview cannot write
 * anything the server would not have planned itself.
 *
 * Multipart fields: year, round, mode ('replace' | 'add'), and either `file`
 * (.xlsx / .csv / .txt) or `text` (pasted roll numbers).
 */
export async function POST(request) {
    if (!isAuthenticated(request)) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const origin = request.headers.get('origin');
    if (origin && new URL(origin).host !== request.headers.get('host')) {
        return NextResponse.json({ success: false, message: 'Bad origin.' }, { status: 403 });
    }

    const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';

    let form;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json({ success: false, message: 'Expected a form upload.' }, { status: 400 });
    }

    const year = String(form.get('year') || '');
    const round = String(form.get('round') || '');
    const mode = String(form.get('mode') || 'replace');
    const text = String(form.get('text') || '');
    const rawFile = form.get('file');
    const file = rawFile && typeof rawFile.arrayBuffer === 'function' && rawFile.size ? rawFile : null;

    if (!isValidYear(year)) return NextResponse.json({ success: false, message: 'Pick an academic year.' }, { status: 400 });
    if (!roundByKey(round)) return NextResponse.json({ success: false, message: 'Pick a round.' }, { status: 400 });
    if (!UPLOAD_MODES.includes(mode)) return NextResponse.json({ success: false, message: 'Unknown upload mode.' }, { status: 400 });
    if (!file && !text.trim()) {
        return NextResponse.json({ success: false, message: 'Attach a file or paste the roll numbers.' }, { status: 400 });
    }
    if (file && file.size > MAX_BYTES) {
        return NextResponse.json(
            { success: false, message: `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 4 MB.` },
            { status: 413 }
        );
    }
    if (!file && text.length > MAX_TEXT) {
        return NextResponse.json({ success: false, message: 'That paste is too long — upload it as a file instead.' }, { status: 413 });
    }

    let input;
    try {
        input = await readRollInput({ text, file });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 422 });
    }
    if (!input.keys.length) {
        return NextResponse.json(
            {
                success: false,
                message: input.column
                    ? `Found the "${input.column}" column, but no roll numbers under it.`
                    : 'No roll numbers found. Each one should look like the roll numbers on the hostel roster.',
                ignored: input.ignored.slice(0, 20)
            },
            { status: 422 }
        );
    }

    try {
        const plan = await planRoundUpload({ year, round, mode, keys: input.keys });
        const parse = { column: input.column, ignored: input.ignored.slice(0, 50), ignoredCount: input.ignored.length, duplicates: input.duplicates };

        // Nothing on the roster matched. Committing a REPLACE now would empty the
        // round's list — refuse rather than let a wrong file wipe it.
        if (!plan.matched) {
            return NextResponse.json(
                {
                    success: false,
                    message: `None of the ${plan.received} roll number(s) are on the ${year} hostel roster. Check the academic year and the file.`,
                    plan: publicPlan(plan),
                    parse
                },
                { status: 422 }
            );
        }

        if (dryRun) return NextResponse.json({ success: true, dryRun: true, plan: publicPlan(plan), parse });

        const result = await applyRoundUpload(plan);
        return NextResponse.json({ success: true, dryRun: false, plan: publicPlan(plan), parse, result });
    } catch (error) {
        console.error('[admin/selection/rounds] upload failed:', error);
        return NextResponse.json({ success: false, message: 'Could not save the list. Nothing was changed.' }, { status: 500 });
    }
}
