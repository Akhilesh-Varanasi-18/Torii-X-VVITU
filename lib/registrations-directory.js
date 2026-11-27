// =========================================================================
// Registrations directory — shared filter definitions
// =========================================================================
//
// PURE module, safe on both sides (§8.7). The admin tab imports it for its
// filter controls; /api/admin/registrations/list and .../export import it to
// turn a query string into a MongoDB match.
//
// One copy on purpose: "Export Excel" has to mean "the rows I am looking at".
// If the table and the workbook each built their own filter they would drift,
// and the drift would be silent — a sheet that looks right and is not.

import { REGISTRATION_PROGRAMS, BRANCH_OPTIONS, OTHER_BRANCH } from './registration-schema';
import { PAGE_SIZES, DEFAULT_PAGE_SIZE, resolveLimit, paginate } from './interview-panels';

export { PAGE_SIZES, DEFAULT_PAGE_SIZE, resolveLimit, paginate };

/**
 * Scoped by programme CODE ('AIR-300'), not key, so the register speaks the
 * same identifier as the rest of the selection page — one picker drives all of
 * it, and a key here would mean translating at every boundary.
 */
export const DEFAULT_PROGRAM_CODE = 'AIR-300';

export const programByCode = (code) => REGISTRATION_PROGRAMS.find((p) => p.code === code) || null;

/** Branch choices, plus the free-text escape hatch, in the order the form offers them. */
export const BRANCH_FILTERS = BRANCH_OPTIONS;
export { OTHER_BRANCH };

/** Short label for a branch — the full option string is far too long for a chip or a cell. */
export function branchShort(option) {
    if (!option) return '';
    if (option === OTHER_BRANCH) return 'OTHER';
    const m = String(option).match(/\(([^)]+)\)\s*$/);
    return m ? m[1] : String(option);
}

export const GENDERS = ['Female', 'Male'];
export const ADMISSION_TYPES = ['Regular', 'Lateral Entry'];
export const YES_NO = ['Yes', 'No'];

export const REG_SORTS = [
    { key: 'recent', label: 'Newest first' },
    { key: 'oldest', label: 'Oldest first' },
    { key: 'name', label: 'Name (A-Z)' },
    { key: 'roll', label: 'Roll number' },
    { key: 'cgpa', label: 'CGPA (high to low)' }
];
export const REG_SORT_KEYS = REG_SORTS.map((s) => s.key);

/** Mongo sort spec per key. `_id` is the tie-breaker so paging is stable:
 *  without it two rows with equal CGPA can swap between pages. */
export const sortSpec = (key) =>
    ({
        oldest: { createdAt: 1, _id: 1 },
        name: { fullName: 1, _id: 1 },
        roll: { rollNumber: 1, _id: 1 },
        cgpa: { cgpa: -1, _id: 1 }
    })[key] || { createdAt: -1, _id: -1 };

/** Day ranges, IST (§8.8) — "today" means today in Guntur, not on the server. */
export const RANGES = [
    { key: 'all', label: 'All time' },
    { key: 'today', label: 'Today' },
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' }
];
export const RANGE_KEYS = RANGES.map((r) => r.key);

const IST_OFFSET_MS = 330 * 60 * 1000;

/** Start of the IST day that `now` falls in, as a UTC instant. */
function istDayStart(now, daysBack = 0) {
    const ist = new Date(now.getTime() + IST_OFFSET_MS);
    const midnightIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() - daysBack);
    return new Date(midnightIst - IST_OFFSET_MS);
}

export function rangeMatch(key, now = new Date()) {
    if (key === 'today') return { createdAt: { $gte: istDayStart(now) } };
    if (key === '7d') return { createdAt: { $gte: istDayStart(now, 6) } };
    if (key === '30d') return { createdAt: { $gte: istDayStart(now, 29) } };
    return {};
}

/** Escape a user string so it cannot smuggle regex syntax into the query. */
const escapeRe = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Turn the directory's query parameters into { match, sort, meta }.
 *
 * Anything unrecognised is dropped rather than rejected: a stale bookmark
 * should still render the list, not a 400.
 */
export function buildQuery(params, { now = new Date() } = {}) {
    const get = (k) => String(params.get(k) || '').trim();

    const programCode = get('program') || DEFAULT_PROGRAM_CODE;
    const program = programCode === 'all' ? null : programByCode(programCode);

    const range = RANGE_KEYS.includes(get('range')) ? get('range') : 'all';
    const q = get('q').slice(0, 80);
    const branch = get('branch').slice(0, 120);
    const gender = GENDERS.includes(get('gender')) ? get('gender') : '';
    const admission = ADMISSION_TYPES.includes(get('admission')) ? get('admission') : '';
    const laptop = YES_NO.includes(get('laptop')) ? get('laptop') : '';
    const sort = REG_SORT_KEYS.includes(get('sort')) ? get('sort') : 'recent';

    const match = { ...rangeMatch(range, now) };
    if (program) match.programCode = program.code;
    if (branch) match.branch = branch;
    if (gender) match.gender = gender;
    if (admission) match.admissionType = admission;
    if (laptop) match.hasLaptop = laptop;

    if (q) {
        // One box across the five identifiers a person actually has to hand.
        // Anchored on neither end so a partial roll or a surname both work.
        const re = new RegExp(escapeRe(q), 'i');
        match.$or = [
            { fullName: re },
            { rollNumber: re },
            { collegeEmail: re },
            { mobileNumber: re },
            { registrationId: re }
        ];
    }

    return {
        match,
        sort: sortSpec(sort),
        meta: { programCode: program ? program.code : 'all', program, range, q, branch, gender, admission, laptop, sort }
    };
}

/** True when anything narrows the list — drives the "Clear filters" affordance. */
export const isFiltered = (meta) =>
    Boolean(meta.q || meta.branch || meta.gender || meta.admission || meta.laptop || meta.range !== 'all');
