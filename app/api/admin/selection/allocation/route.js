import { NextResponse } from 'next/server';
import { isAuthenticated } from '../../../../../lib/dashboard-auth';
import { isValidYear, UPLOAD_MODES, isValidProgramCode, DEFAULT_PROGRAM_CODE } from '../../../../../lib/selection-results';
import {
    readAllocationInput,
    planAllocationUpload,
    applyAllocationUpload,
    publicAllocationPlan
} from '../../../../../lib/interview-panels-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Same guard as the other uploads: Vercel refuses bodies over ~4.5 MB at the
// edge, so anything larger would fail there with a less useful message.
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Upload the interview timetable for one academic year: who sits with which
 * panel, on which day, in which slot.
 *
 * Two-phase like every other upload here. `?dryRun=1` reads the sheet, matches
 * it against the roster and returns the preview — who gains a slot, whose slot
 * changes, who loses one, who is not on the roster, who is scheduled without
 * being on the interview list — without writing. The page then re-sends the
 * same file without the flag to commit, and the plan is recomputed server-side
 * rather than trusted from the client.
 *
 * Multipart fields: year, mode ('replace' | 'add'), and `file` (.xlsx / .csv).
 *
 * Scores are never touched. Re-timetabling happens often and must not cost the
 * panel work it has already done.
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
    const mode = String(form.get('mode') || 'replace');
    const code = String(form.get('program') || DEFAULT_PROGRAM_CODE);
    const rawFile = form.get('file');
    const file = rawFile && typeof rawFile.arrayBuffer === 'function' && rawFile.size ? rawFile : null;

    if (!isValidYear(year)) return NextResponse.json({ success: false, message: 'Pick an academic year.' }, { status: 400 });
    if (!isValidProgramCode(code)) return NextResponse.json({ success: false, message: 'Pick a programme.' }, { status: 400 });
    if (!UPLOAD_MODES.includes(mode)) return NextResponse.json({ success: false, message: 'Unknown upload mode.' }, { status: 400 });
    if (!file) return NextResponse.json({ success: false, message: 'Attach the allocation sheet.' }, { status: 400 });
    if (file.size > MAX_BYTES) {
        return NextResponse.json(
            { success: false, message: `That file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 4 MB.` },
            { status: 413 }
        );
    }

    let input;
    try {
        input = await readAllocationInput({ file });
    } catch (error) {
        return NextResponse.json({ success: false, message: error.message }, { status: 422 });
    }
    if (!input.rows.length) {
        return NextResponse.json(
            {
                success: false,
                message: 'Found the columns, but no rows with a readable roll number under them.',
                ignored: input.ignored.slice(0, 20)
            },
            { status: 422 }
        );
    }

    try {
        const plan = await planAllocationUpload({ year, code, mode, rows: input.rows });
        const parse = {
            columns: input.columns,
            ignored: input.ignored.slice(0, 50),
            ignoredCount: input.ignored.length,
            duplicates: input.duplicates,
            warnings: input.warnings.slice(0, 50),
            warningCount: input.warnings.length
        };

        // Nothing matched. Committing a REPLACE now would clear the whole
        // timetable — refuse rather than let the wrong sheet wipe it.
        if (!plan.matched) {
            return NextResponse.json(
                {
                    success: false,
                    message: `None of the ${plan.received} roll number(s) are on the ${year} hostel roster. Check the academic year and the sheet.`,
                    plan: publicAllocationPlan(plan),
                    parse
                },
                { status: 422 }
            );
        }

        if (dryRun) return NextResponse.json({ success: true, dryRun: true, plan: publicAllocationPlan(plan), parse });

        const result = await applyAllocationUpload(plan);
        return NextResponse.json({ success: true, dryRun: false, plan: publicAllocationPlan(plan), parse, result });
    } catch (error) {
        console.error('[admin/selection/allocation] upload failed:', error);
        return NextResponse.json({ success: false, message: 'Could not save the timetable. Nothing was changed.' }, { status: 500 });
    }
}
