// =========================================================================
// AI Ready Engineers — interview panel allocation: shared definitions
// =========================================================================
//
// PURE module, safe on both sides (§8.7). The admin page imports it for labels
// and display formatting; the API routes and the store import it to validate an
// uploaded allocation sheet. One copy so the sheet the panel uploads and the
// sheet the page describes can never drift.
//
// ── What an allocation is ───────────────────────────────────────────────────
// Who sits in front of whom, when. It is NOT a selection round: a student is on
// the interview round's list because they qualified, and has an allocation
// because someone built a timetable. The two are uploaded separately and either
// can exist without the other — a student can be scheduled before the list is
// finalised, or (more often) be on the list with no slot yet.
//
// Stored on the student's own roster document beside the rounds:
//
//   results: {
//     '2026-27': {
//       rounds:     { … },
//       allocation: { panel, panelist, date, start, end, link, at },
//       interview:  { coding, communication, remarks, scoredBy, scoredAt }
//     }
//   }
//
// `panel` is a free-text label, not an enum. VVITU ran "Panel 1".."Panel 6" on
// Microsoft Teams across 23-25 Nov, but the 21 Nov pilot ran its own three
// panels on Google Meet with nobody named. Those are different panels that
// happen to share a number, so the label has to be able to say so — a fixed
// 1..6 enum would silently merge the pilot's students into Rahul's panel.

/** Upload column headers we recognise, folded to lower case with spaces/underscores collapsed. */
export const ALLOCATION_HEADERS = {
    roll: ['roll no', 'rollno', 'roll number', 'rollnumber', 'roll', 'regd no', 'regdno', 'reg no', 'hall ticket', 'htno', 'ht no'],
    panel: ['panel', 'panel no', 'panel name', 'room'],
    panelist: ['panelist', 'panellist', 'panel member', 'interviewer', 'taken by', 'panel in charge', 'panel incharge'],
    date: ['date', 'interview date', 'day'],
    start: ['start time', 'start', 'from', 'time', 'slot', 'timing'],
    end: ['end time', 'end', 'to'],
    link: ['meeting link', 'link', 'meet link', 'joining link', 'url']
};

export const foldHeader = (v) =>
    String(v ?? '')
        .toLowerCase()
        .replace(/[._]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

/** Which allocation field, if any, this header cell names. */
export function headerField(cell) {
    const f = foldHeader(cell);
    for (const [field, names] of Object.entries(ALLOCATION_HEADERS)) {
        if (names.includes(f)) return field;
    }
    return null;
}

export const MAX_PANEL = 40;
export const MAX_PANELIST = 60;
export const MAX_LINK = 300;

/** Collapse whitespace and cap. Panel and panelist are labels, not prose. */
export const cleanLabel = (v, max) =>
    String(v ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);

// ── Dates ───────────────────────────────────────────────────────────────────
//
// Stored and compared as 'YYYY-MM-DD' strings, never Date objects. An interview
// happens on a calendar day in Guntur; turning that into an instant and back
// through a browser timezone is how a 25 Nov slot becomes 24 Nov for someone
// whose laptop clock is set abroad. Same reasoning as the dated badges on the
// public selection-process cards.

export const isValidDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Read a date cell. Accepts what a spreadsheet actually contains:
 * '2026-11-23' (what we write), a real Excel date (exceljs hands back a Date),
 * '23/11/2026' and '23-11-2026' (day first — the Indian convention, and what
 * every sheet the college sends uses), and '23 Nov 2026' / 'Mon 23 Nov 2026'.
 *
 * Returns 'YYYY-MM-DD' or '' when it cannot be read. Deliberately does NOT
 * guess a year: a sheet without one is a sheet to fix, not to interpret.
 */
export function parseDate(value) {
    if (value === null || value === undefined) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        // exceljs reads an Excel date as UTC midnight; read it back the same way
        // so the calendar day survives.
        return value.toISOString().slice(0, 10);
    }
    const text = String(value).trim();
    if (!text) return '';

    let m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return isValidDate(text) ? text : '';

    m = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/); // day first
    if (m) {
        const out = `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
        return isValidDate(out) ? out : '';
    }

    m = text.match(/(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{4})/); // 23 Nov 2026
    if (m) {
        const mon = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
        if (mon >= 0) {
            const out = `${m[3]}-${String(mon + 1).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
            return isValidDate(out) ? out : '';
        }
    }
    return '';
}

// ── Times ───────────────────────────────────────────────────────────────────

export const isValidTime = (v) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/**
 * Read a time cell into 24-hour 'HH:MM'. Accepts '16:00', '4:00 PM', '4 PM',
 * '4:00pm' and an Excel time (a fraction of a day, or a Date).
 *
 * A bare '4:00' is read as 04:00, the plain 24-hour reading — NOT silently
 * promoted to the afternoon. Guessing would be right most of the time here
 * (every slot this programme runs is 4-9 PM) and invisibly wrong the once it
 * was not; instead the upload preview flags anything before 08:00 so the person
 * uploading decides. The sheet we generate always writes 24-hour, so a
 * round-trip never relies on any of this.
 */
export function parseTime(value) {
    if (value === null || value === undefined) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
    }
    if (typeof value === 'number' && value >= 0 && value < 1) {
        const mins = Math.round(value * 24 * 60);
        return `${String(Math.floor(mins / 60) % 24).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
    }
    const text = String(value).trim().toLowerCase();
    if (!text) return '';

    const m = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!m) return '';
    let hour = Number(m[1]);
    const mins = Number(m[2] || 0);
    const mer = m[3];
    if (mins > 59) return '';
    if (mer) {
        if (hour < 1 || hour > 12) return '';
        if (mer === 'pm' && hour !== 12) hour += 12;
        if (mer === 'am' && hour === 12) hour = 0;
    } else if (hour > 23) return '';
    return `${String(hour).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * A slot cell may hold the whole range — '4:00-4:15 PM', '16:00 – 16:15'. The
 * meridiem is often written once, at the end, so when only the second half
 * carries it the first inherits it ('4:00-4:15 PM' is 16:00-16:15, not
 * 04:00-16:15).
 */
export function parseSlotRange(value) {
    const text = String(value ?? '').trim();
    if (!text) return { start: '', end: '' };
    const parts = text.split(/\s*(?:[-–—]|to)\s*/i).filter(Boolean);
    if (parts.length < 2) return { start: parseTime(text), end: '' };
    const tail = parts[1].match(/(am|pm)/i);
    const headHasMer = /(am|pm)/i.test(parts[0]);
    const head = tail && !headHasMer ? `${parts[0]} ${tail[1]}` : parts[0];
    return { start: parseTime(head), end: parseTime(parts[1]) };
}

/** '16:00' -> '4:00 PM'. Display only. */
export function formatTime(hhmm) {
    if (!isValidTime(hhmm)) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const mer = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 === 0 ? 12 : h % 12;
    return `${hour}:${String(m).padStart(2, '0')} ${mer}`;
}

/** '16:00','16:15' -> '4:00 – 4:15 PM' (one meridiem when both sides share it). */
export function formatSlot(start, end) {
    if (!isValidTime(start)) return '';
    if (!isValidTime(end)) return formatTime(start);
    const a = formatTime(start);
    const b = formatTime(end);
    const merA = a.slice(-2);
    return merA === b.slice(-2) ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
}

/** '2026-11-23' -> 'Mon, 23 Nov'. Built from the string, never through a Date's
 *  local timezone, so the day cannot shift. */
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatDate(iso, { withYear = false } = {}) {
    if (!isValidDate(iso)) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const dow = DAY_NAMES[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    return `${dow}, ${d} ${MONTH_NAMES[m - 1]}${withYear ? ` ${y}` : ''}`;
}

/** Sort key for a slot: the date, then the start time. Both are zero-padded
 *  strings, so a plain string compare is already chronological. */
export const slotKey = (a) => `${a?.date || '9999-99-99'} ${a?.start || '99:99'}`;

/**
 * Panels in the order a person expects: grouped by their name, then by number
 * inside the group — "Panel 1..Panel 6" then "Pilot 1..Pilot 3", and "Panel 2"
 * before "Panel 10". Comparing the number first would interleave the two
 * families (Panel 1, Pilot 1, Panel 2, Pilot 2…), which reads as noise in the
 * panel strip. Anything unnumbered sorts after the numbered ones.
 */
export function comparePanels(a, b) {
    const split = (v) => {
        const m = String(v).match(/^(.*?)(\d+)\s*$/);
        return m ? { stem: m[1].trim().toLowerCase(), n: Number(m[2]) } : { stem: String(v).trim().toLowerCase(), n: null };
    };
    const x = split(a);
    const y = split(b);
    if (x.stem !== y.stem) return x.stem.localeCompare(y.stem);
    if (x.n !== null && y.n !== null) return x.n - y.n;
    if (x.n !== null) return -1;
    if (y.n !== null) return 1;
    return String(a).localeCompare(String(b));
}

/** The three states a scheduled student can be in. `scheduled` counts everyone
 *  with a slot; `pending` is simply scheduled minus completed. */
export const PANEL_STATUSES = [
    { key: 'all', label: 'All' },
    { key: 'completed', label: 'Completed' },
    { key: 'pending', label: 'Pending' }
];

export const MAX_SCORED_BY = 60;

// ── Paging ──────────────────────────────────────────────────────────────────
//
// Same contract as the coding-profiles directory (lib/coding-profiles/cohort.js
// — `PAGE_SIZES`, `resolveLimit`, `paginate`), so the two tables behave
// identically and a person who has used one already knows this one. Copied
// rather than imported: cohort.js pulls in score.js, boards.js, programs.js and
// period.js, and none of that belongs in the selection module. Nothing here has
// to AGREE with that file — they are two independent tables — so a copy cannot
// cause the kind of drift §6.1 guards against.

export const PAGE_SIZES = [10, 50, 100, 200];
export const DEFAULT_PAGE_SIZE = 50;

/** A page size from the query string, or the default. 'all' is kept for the export. */
export function resolveLimit(raw) {
    if (raw === 'all') return 'all';
    const n = Number(raw);
    return PAGE_SIZES.includes(n) ? n : DEFAULT_PAGE_SIZE;
}

/** One page of rows plus the figures the pager needs. */
export function paginate(rows, rawPage, limit) {
    const total = rows.length;
    if (limit === 'all') return { total, page: 1, pages: 1, limit: 'all', rows };
    const pages = Math.max(1, Math.ceil(total / limit));
    // Clamped, so narrowing a filter while on page 9 lands on the last page
    // that exists rather than on an empty one.
    const page = Math.min(Math.max(1, Number(rawPage) || 1), pages);
    const start = (page - 1) * limit;
    return { total, page, pages, limit, rows: rows.slice(start, start + limit) };
}

/** Sort orders the schedule table offers. Validated server-side. */
export const PANEL_SORTS = [
    { key: 'slot', label: 'Slot time' },
    { key: 'name', label: 'Name' },
    { key: 'total', label: 'Total score' },
    { key: 'panel', label: 'Panel' }
];
export const PANEL_SORT_KEYS = PANEL_SORTS.map((s) => s.key);

/** The pseudo-panel for students on the interview list with no slot at all. */
export const NO_PANEL = '__none';

