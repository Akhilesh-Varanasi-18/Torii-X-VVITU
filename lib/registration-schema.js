// Single source of truth for registration data: option lists, the program
// catalogue (which intake is open, what it maps to), and the validation rules.
// Imported by BOTH the client modal and the /api/register route so the two can
// never drift apart. The server always re-runs validateRegistration() —
// client-side checks are only a UX convenience.

import { MOON_CODER_WHATSAPP_URL } from './site-config';

// VVITU's B.Tech programmes, grouped under the department that runs them —
// the grouping is the university's own, so a student recognises their department
// first and then picks their exact branch inside it.
//
// Each option ends with a parenthetical short code. That trailing code is what
// the dashboard axes and the Excel export use (see branchOptionForCode below and
// shortBranch in dashboard-theme.js), and it is read as the LAST parenthetical —
// three of these names carry their own brackets mid-string.
//
// OTHER_BRANCH is the escape hatch. Rejecting a student because their programme
// is missing from a hard-coded list is the worst possible failure here, so the
// list ends with an "not listed" entry that opens a free-text box; what they type
// is kept in `branchOther` and shown wherever the branch is displayed.
export const OTHER_BRANCH = 'My branch is not listed (OTHER)';

export const BRANCH_GROUPS = [
    {
        label: 'Department of Computer Science and Engineering',
        options: [
            'B.Tech - Computer Science and Engineering (CSE)',
            'B.Tech - CSE (IoT and Cyber Security including Blockchain Technology) (CIC)'
        ]
    },
    {
        label: 'Department of Computer Science and Engineering and Artificial Intelligence',
        options: [
            'B.Tech - CSE (Artificial Intelligence and Machine Learning) (AIML)',
            'B.Tech - CSE (Artificial Intelligence and Data Science) (AIDS)'
        ]
    },
    {
        label: 'Department of Electronics and Communication Engineering',
        options: ['B.Tech - Electronics and Communication Engineering (ECE)']
    },
    {
        label: 'Department of Electrical and Electronics Engineering',
        options: ['B.Tech - Electrical and Electronics Engineering (EEE)']
    },
    {
        label: 'Department of Civil Engineering',
        options: ['B.Tech - Civil Engineering (CIVIL)']
    },
    {
        label: 'Department of Mechanical Engineering',
        options: ['B.Tech - Mechanical Engineering (MECH)']
    },
    {
        label: 'Not listed above',
        options: [OTHER_BRANCH]
    }
];

// Flat list of every valid branch value — the single source the validator and the
// Excel export check against. Derived from the groups so the two never drift.
export const BRANCH_OPTIONS = BRANCH_GROUPS.flatMap((group) => group.options);

/**
 * Resolves a short department code (as the coding-profiles roster stores it:
 * "AIDS", "CSIT", "CSE" …) to the full branch option the form uses. The roster
 * codes drop the ampersand, so "AI&DS" and "AIDS" both resolve.
 */
export function branchOptionForCode(code) {
    const wanted = String(code || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (!wanted) return '';
    return BRANCH_OPTIONS.find((option) => branchShortCode(option).toUpperCase().replace(/[^A-Z]/g, '') === wanted) || '';
}

/**
 * The short code for a branch label — the LAST parenthetical, not the first.
 * Several VVITU programme names carry their own brackets mid-string
 * ("B.Tech - CSE (Artificial Intelligence and Data Science) (AIDS)"), so taking
 * the first match would return the specialisation instead of the code.
 */
export function branchShortCode(name) {
    const matches = String(name || '').match(/\(([^()]*)\)/g);
    if (!matches || !matches.length) return String(name || '');
    return matches[matches.length - 1].slice(1, -1);
}

export const GENDER_VALUES = ['Male', 'Female'];
export const RESIDENCE_VALUES = ['Hosteler', 'Day Scholar'];
export const LAPTOP_VALUES = ['Yes', 'No'];

// Class time slots a Moon Coder student chooses between. Rows store the label
// (readable in exports and charts) plus the stable key, so a reworded label
// never orphans earlier registrations.
export const TIME_SLOTS = [
    { key: 'slot-1', label: '4:30 PM – 6:00 PM' },
    { key: 'slot-2', label: '5:15 PM – 6:45 PM' }
];
export const TIME_SLOT_BY_KEY = Object.fromEntries(TIME_SLOTS.map((s) => [s.key, s]));

// ── Study year, for intakes that span years ─────────────────────────────────
//
// Every other intake is one year group, so its passout year is a property OF
// THE PROGRAM and the server stamps it — a student cannot pair a program with
// the wrong year because they never send the year at all.
//
// Moon Coder breaks that: it takes hostelers from EVERY year, so there is no
// single correct answer and the student has to tell us. A program that sets
// `studyYears` asks this question, and `validateRegistration()` takes the
// passout year from the chosen option rather than from the program.
//
// The years are still a closed list, not free text — the student picks a key
// and the server resolves it, so a tampered request still cannot invent a
// passout year that is not on this list.
export const STUDY_YEARS = [
    { key: 'year-1', label: '1st Year', passoutYear: '2030' },
    { key: 'year-2', label: '2nd Year', passoutYear: '2029' },
    { key: 'year-3', label: '3rd Year', passoutYear: '2028' },
    { key: 'year-4', label: 'Final Year', passoutYear: '2027' }
];
export const STUDY_YEAR_BY_KEY = Object.fromEntries(STUDY_YEARS.map((y) => [y.key, y]));
// CRT enrolment is no longer collected — field retired per management. Kept here
// (commented) so the whole feature can be restored in one place if needed.
// export const CRT_FEE_VALUES = ['Yes', 'No'];

// ── Program catalogue ───────────────────────────────────────────────────────
//
// Every intake the form has ever offered, in the order the program picker shows
// them. Opening or closing an intake is ONE flag here (`open`) plus the matching
// `registrationsOpen` / `registrationsClosed` flag on the card in
// components/vvitu/programs-data.js. The API rejects submissions for a closed
// program, so flipping the flag closes the door server-side too.
//
//   eligibility  'skillup-roster' → only students on the SkillUp Coder coding
//                 roster (the 317 shortlisted) may register. The form makes them
//                 find themselves first; name, contact details, branch, gender,
//                 residence and laptop are then taken from their SkillUp
//                 registration ON THE SERVER — the student never re-enters or
//                 edits them. Anything else (undefined) → open to all.
//   academics     true → Overall CGPA and active-backlog count are mandatory.
//   timeSlots     [{ key, label }] → the student must pick one class time slot.
//   whatsappGroup { name, url } → the success screen asks the student to join
//                 this program's own WhatsApp group with a highlighted button
//                 (the official community link stays as the secondary action).
//
export const REGISTRATION_PROGRAMS = [
    {
        key: 'mooncoder',
        programName: 'Moon Coder',
        code: 'MOON-200',
        passoutYear: '2029',
        yearLabel: '2nd Year (2025 – 2029)',
        audience: 'Exclusive for hostelers',
        badge: 'Industry Skilling Track',
        // OPEN (2026-10-27). Paired with `registrationsOpen: true` on the
        // mooncoder card in components/vvitu/programs-data.js — §8.1, both flags
        // or neither. This one is the load-bearing half: it gates the modal, and
        // /api/register re-checks it server-side before writing.
        open: true,

        // ⚠️ `eligibility: 'skillup-roster'` was REMOVED here, and removing it was
        // required rather than tidy-up.
        //
        // At SRKR this intake was gated to the 317-student SkillUp Coder roster:
        // the student picked themselves from that list and the server filled in
        // their details. VVITU has never run SkillUp Coder, and its
        // coding-profiles catalogue is empty — so the roster that gate reads
        // does not exist. Left in place, every lookup would have returned no
        // match and NOBODY could have registered, with the form showing an empty
        // search rather than an error anyone could diagnose.
        //
        // Without it this is an ordinary open intake: the student types their own
        // details and `validateRegistration()` checks them.

        academics: true,
        // This batch takes hostelers from every year, so the student picks their
        // year and the passout year comes from that — see STUDY_YEARS above. The
        // `passoutYear` and `yearLabel` fields on this program stay only as the
        // fallback for a payload that somehow carries no choice; for a real
        // submission the chosen year wins.
        studyYears: STUDY_YEARS,
        // NO TIME SLOT. Removed 2026-10-27 — VVITU does not want students
        // choosing a class time for this batch. The evening slots were carried
        // over from the previous Moon Coder intake and nobody asked for them.
        //
        // One line does the whole job: every time-slot code path is gated on
        // `program.timeSlots`, so with the key absent the form stops rendering
        // the picker, the validator stops requiring it, and /api/register stops
        // writing the two columns. TIME_SLOTS itself is left defined above so
        // restoring it is this line back:
        //     timeSlots: TIME_SLOTS,
        whatsappGroup: { name: 'Moon Coder WhatsApp Group', url: MOON_CODER_WHATSAPP_URL },
        color: 'var(--vvitu-secondary)',
        bgColor: 'var(--vvitu-bg-warm-tint)',
        borderColor: 'rgba(237, 114, 54, 0.3)',
        description:
            'Four industry tracks for hostelers — Full Stack Development, Google Flutter, ServiceNow Platform Engineering and Data Analytics.'
    },
    {
        key: 'bamboo',
        programName: 'Bamboo Coder',
        code: 'BMB-100',
        passoutYear: '2030',
        yearLabel: '1st Year (2026 – 2030)',
        audience: '2030 passouts · 1st years',
        badge: 'Foundation Track',
        // 1st-year (2030) intake closed on 2026-10-15 once the post-orientation
        // registrations were complete.
        open: false,
        color: 'var(--vvitu-primary)',
        bgColor: 'var(--vvitu-bg-coral-tint)',
        borderColor: 'rgba(226, 84, 76, 0.3)',
        description: 'Comprehensive C programming, computational problem solving, data flow & modular coding logic.'
    },
    {
        key: 'skillup',
        programName: 'SkillUp Coder',
        code: 'SKL-200',
        passoutYear: '2029',
        yearLabel: '2nd Year (2025 – 2029)',
        audience: '2029 passouts · 2nd years',
        badge: 'Core Problem Solving',
        // Closed: VVITU is running AI Ready only. The matching card in
        // components/vvitu/programs-data.js carries `comingSoon: true` (§8.1 —
        // both flags move together, and this is the one the API enforces).
        open: false,
        color: 'var(--vvitu-secondary)',
        bgColor: 'var(--vvitu-bg-warm-tint)',
        borderColor: 'rgba(237, 114, 54, 0.3)',
        description: 'Data Structures, Algorithms, LeetCode patterns, and intermediate coding interview preparation.'
    },
    {
        key: 'aiready',
        programName: 'AI Ready Engineers',
        code: 'AIR-300',
        // VVITU runs AI Ready for 2nd years, not 3rd as SRKR does — so this
        // track shares the 2029 passout year with SkillUp Coder. See the note on
        // YEAR_PROGRAMS below for why that needs handling rather than ignoring.
        passoutYear: '2029',
        yearLabel: '2nd Year (2025 – 2029)',
        audience: '2029 passouts · 2nd years',
        badge: 'Industry Specialization',
        // Live since 2026-10-26. Moon Coder is open too (2026-10-27), so this is
        // no longer the only one — it stays the DEFAULT the form opens on, which
        // is now stated explicitly at DEFAULT_PROGRAM_KEY rather than falling out
        // of array order. Paired with `registrationsOpen: true` on the aiready
        // card in programs-data.js (§8.1).
        open: true,
        // Turns on the academics block: overall CGPA + active backlogs (both
        // mandatory), how the student joined, and — for lateral entry — the
        // diploma CGPA.
        academics: true,
        color: 'var(--vvitu-primary)',
        bgColor: 'var(--vvitu-bg-coral-tint)',
        borderColor: 'rgba(226, 84, 76, 0.3)',
        description: 'Problem Solving & DSA, Advanced Competitive Programming, Full Stack Development and Google Flutter.'
    }
];

export const PROGRAM_BY_KEY = Object.fromEntries(REGISTRATION_PROGRAMS.map((p) => [p.key, p]));
export const PROGRAM_BY_CODE = Object.fromEntries(REGISTRATION_PROGRAMS.map((p) => [p.code, p]));
export const OPEN_PROGRAM_KEYS = REGISTRATION_PROGRAMS.filter((p) => p.open).map((p) => p.key);

// What the form starts on when nothing picked a program for it — the header's
// Register button and the hero CTA. A program CARD always passes its own key, so
// this never overrides "Register Now" on a specific card.
//
// This used to be `OPEN_PROGRAM_KEYS[0]`, which was unambiguous only while one
// intake was open. With Moon Coder open as well that silently became whichever
// intake sits earlier in the array above — Moon Coder, by accident of ordering,
// not by decision. Naming the preference keeps it a decision: AI Ready is the
// broader intake (any 2nd year, not just hostelers), so an unqualified
// "Register" opens on it, and the picker lets them switch in one click.
const PREFERRED_DEFAULT = 'aiready';
export const DEFAULT_PROGRAM_KEY =
    (OPEN_PROGRAM_KEYS.includes(PREFERRED_DEFAULT) && PREFERRED_DEFAULT)
    || OPEN_PROGRAM_KEYS[0]
    || REGISTRATION_PROGRAMS[0].key;

// ── Passout-year view of the same catalogue (older callers) ────────────────
// The announcements feature and the dashboard still think in passout years, and
// older submissions carried `passoutYear` instead of `programKey`. These are
// derived from the year-based programs above so there is still one source.
const YEAR_PROGRAMS = ['bamboo', 'skillup', 'aiready'].map((key) => PROGRAM_BY_KEY[key]);

// SkillUp Coder and AI Ready are BOTH 2029 passouts at VVITU, so this view is
// many-programs-to-one-year. Left naive it would list "2029 Passouts" twice in
// the announcement tier picker and let Object.fromEntries silently keep
// whichever program happened to come last. Dedupe by year, and when two
// programs collide prefer the open one — the live intake is the one an
// announcement for that year is about.
const byYear = new Map();
for (const p of YEAR_PROGRAMS) {
    const held = byYear.get(p.passoutYear);
    if (!held || (p.open && !held.open)) byYear.set(p.passoutYear, p);
}
const YEAR_PROGRAMS_UNIQUE = [...byYear.values()];

export const PASSOUT_YEARS = YEAR_PROGRAMS_UNIQUE.map((p) => p.passoutYear);
// A year counts as closed only when no program for it is open.
export const CLOSED_PASSOUT_YEARS = YEAR_PROGRAMS_UNIQUE.filter((p) => !p.open).map((p) => p.passoutYear);
export const PASSOUT_YEAR_PROGRAM_MAP = Object.fromEntries(
    YEAR_PROGRAMS_UNIQUE.map((p) => [
        p.passoutYear,
        {
            yearLabel: p.yearLabel,
            programName: p.programName,
            code: p.code,
            badge: p.badge,
            color: p.color,
            bgColor: p.bgColor,
            borderColor: p.borderColor,
            description: p.description
        }
    ])
);
const PROGRAM_KEY_BY_YEAR = Object.fromEntries(YEAR_PROGRAMS_UNIQUE.map((p) => [p.passoutYear, p.key]));

export const FIELD_LIMITS = {
    fullName: 60,
    rollNumber: 15,
    collegeEmail: 120,
    mobileNumber: 10,
    // "10.00" is the longest sensible CGPA; backlogs are a small whole number.
    cgpa: 5,
    activeBacklogs: 2,
    // Free-text branch, used only when OTHER_BRANCH is picked.
    branchOther: 80,
    // Ranks are entered as digits; EAPCET tops out in the low hundred-thousands
    // and JEE in the low millions, so 7 digits is generous for both.
    eapcetRank: 7,
    jeeRank: 7
};

export const ADMISSION_TYPES = ['Regular', 'Lateral Entry'];

// Fields a pre-filled form may report as edited by the student. Anything else in
// the client's list is dropped so the stored audit trail only names real fields.
export const PREFILLABLE_FIELDS = [
    'fullName',
    'rollNumber',
    'collegeEmail',
    'mobileNumber',
    'branch',
    'gender',
    'residenceType',
    'hasLaptop'
];

// Letters plus the punctuation that legitimately appears in Indian names
// (D'Souza, Sai Kumar, A. Ramesh). Digits and symbols are rejected.
const NAME_PATTERN = /^[A-Za-z][A-Za-z\s.'-]*$/;
const ROLL_PATTERN = /^[A-Z0-9]+$/;
// Deliberately stricter than the browser's type=email: requires a dotted TLD.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
// Indian mobile numbers are 10 digits starting 6-9.
const MOBILE_PATTERN = /^[6-9]\d{9}$/;
// Up to two decimals: 8, 8.5, 8.25 — the value range is checked separately.
const CGPA_PATTERN = /^\d{1,2}(\.\d{1,2})?$/;

const asString = (value) => {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
};

/** Strips +91 / 0 prefixes, spaces, dashes and brackets so paste-from-contacts works. */
export const normalizeMobile = (raw) => {
    const digits = asString(raw).replace(/[^\d]/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    return digits;
};

/** Uppercases and strips whitespace — the one way a roll number is ever compared. */
export const normalizeRoll = (raw) => asString(raw).trim().toUpperCase().replace(/\s+/g, '');

/**
 * Cleans the optional pre-fill audit block a pre-filled form sends along:
 * which roster entry it was filled from and which fields the student changed.
 * Returns null when the submission was typed from scratch.
 */
export function sanitizePrefill(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const rollKey = normalizeRoll(raw.rollKey);
    if (!rollKey || !ROLL_PATTERN.test(rollKey)) return null;
    const editedFields = Array.isArray(raw.editedFields)
        ? raw.editedFields.filter((f) => PREFILLABLE_FIELDS.includes(f))
        : [];
    return { source: 'skillup-roster', rollKey, editedFields: [...new Set(editedFields)] };
}

/**
 * Normalizes and validates one registration payload.
 * Returns { values, errors } — `values` is the cleaned record, `errors` is a
 * field → message map that is empty when the payload is valid.
 *
 * `values.cgpa` / `values.activeBacklogs` are numbers (or null when the chosen
 * program does not collect them). `values.passoutYear` is derived from the
 * program so a tampered request cannot pair a program with the wrong year.
 */
export function validateRegistration(raw = {}) {
    const programKey = asString(raw.programKey).trim() || PROGRAM_KEY_BY_YEAR[asString(raw.passoutYear).trim()] || '';
    const program = PROGRAM_BY_KEY[programKey] || null;

    const cgpaText = asString(raw.cgpa).trim();
    const backlogText = asString(raw.activeBacklogs).trim();
    const branchText = asString(raw.branch).trim();
    const isOtherBranch = branchText === OTHER_BRANCH;
    const admissionType = asString(raw.admissionType).trim();
    const isLateral = admissionType === 'Lateral Entry';
    const diplomaText = asString(raw.diplomaCgpa).trim();
    // Ranks are digits only — students paste them with commas and spaces.
    const digitsOnly = (v) => asString(v).replace(/[^\d]/g, '');
    const eapcetText = digitsOnly(raw.eapcetRank).slice(0, FIELD_LIMITS.eapcetRank);
    const jeeText = digitsOnly(raw.jeeRank).slice(0, FIELD_LIMITS.jeeRank);
    const slotText = asString(raw.timeSlot).trim();
    const slot = program?.timeSlots ? program.timeSlots.find((s) => s.key === slotText) || null : null;
    // Resolved from a closed list, never trusted as sent — see STUDY_YEARS.
    const studyYearText = asString(raw.studyYear).trim();
    const studyYear = program?.studyYears ? program.studyYears.find((y) => y.key === studyYearText) || null : null;

    const values = {
        fullName: asString(raw.fullName).trim().replace(/\s+/g, ' '),
        rollNumber: normalizeRoll(raw.rollNumber),
        collegeEmail: asString(raw.collegeEmail).trim().toLowerCase(),
        mobileNumber: normalizeMobile(raw.mobileNumber),
        branch: branchText,
        // Only meaningful when the student picked "not listed" — blank otherwise,
        // so a stale value can never ride along with a real branch.
        branchOther: isOtherBranch ? asString(raw.branchOther).trim().replace(/\s+/g, ' ') : '',
        gender: asString(raw.gender).trim(),
        residenceType: asString(raw.residenceType).trim(),
        hasLaptop: asString(raw.hasLaptop).trim(),
        // paidCrtFee: asString(raw.paidCrtFee).trim(), // CRT enrolment retired
        programKey,
        // For a year-spanning intake the student's choice decides this; for
        // every other program it comes from the program, so a tampered request
        // still cannot pair a program with a year it does not run.
        passoutYear: studyYear ? studyYear.passoutYear : (program ? program.passoutYear : ''),
        // Which year they are in right now ("2nd Year"), stored alongside the
        // passout year because the two answer different questions: the passout
        // year is a cohort, this is where they are today. Blank for the
        // single-year intakes, where it would just repeat the program.
        studyYear: studyYear ? studyYear.label : '',
        studyYearKey: studyYear ? studyYear.key : '',
        cgpa: program?.academics && !isLateral && CGPA_PATTERN.test(cgpaText) ? Number(cgpaText) : null,
        activeBacklogs: program?.academics && /^\d{1,2}$/.test(backlogText) ? Number(backlogText) : null,
        // Lateral-entry students joined in 2nd year, so their only completed
        // qualification is the diploma — stored separately from the B.Tech CGPA
        // rather than overloading one column with two different scales.
        admissionType: program?.academics ? admissionType : '',
        diplomaCgpa: program?.academics && isLateral && CGPA_PATTERN.test(diplomaText) ? Number(diplomaText) : null,
        // Entrance ranks are optional for everyone; null means "not given",
        // which is different from a rank of 0 and must stay distinguishable.
        eapcetRank: eapcetText ? Number(eapcetText) : null,
        jeeRank: jeeText ? Number(jeeText) : null,
        timeSlotKey: slot ? slot.key : null,
        timeSlot: slot ? slot.label : null
    };

    const errors = {};

    if (!values.fullName) {
        errors.fullName = 'Please enter your full name';
    } else if (values.fullName.length < 3) {
        errors.fullName = 'Name must be at least 3 characters';
    } else if (values.fullName.length > FIELD_LIMITS.fullName) {
        errors.fullName = `Name must be under ${FIELD_LIMITS.fullName} characters`;
    } else if (!NAME_PATTERN.test(values.fullName)) {
        errors.fullName = 'Name can only contain letters, spaces, dots and hyphens';
    }

    if (!values.rollNumber) {
        errors.rollNumber = 'Please enter your roll number';
    } else if (values.rollNumber.length < 6) {
        errors.rollNumber = 'Roll number must be at least 6 characters';
    } else if (values.rollNumber.length > FIELD_LIMITS.rollNumber) {
        errors.rollNumber = `Roll number must be under ${FIELD_LIMITS.rollNumber} characters`;
    } else if (!ROLL_PATTERN.test(values.rollNumber)) {
        errors.rollNumber = 'Roll number can only contain letters and numbers';
    }

    if (!values.collegeEmail) {
        errors.collegeEmail = 'Please enter your college email ID';
    } else if (values.collegeEmail.length > FIELD_LIMITS.collegeEmail) {
        errors.collegeEmail = 'Email address is too long';
    } else if (!EMAIL_PATTERN.test(values.collegeEmail)) {
        errors.collegeEmail = 'Please enter a valid email address';
    }

    if (!values.mobileNumber) {
        errors.mobileNumber = 'Please enter your mobile number';
    } else if (!MOBILE_PATTERN.test(values.mobileNumber)) {
        errors.mobileNumber = 'Enter a valid 10-digit Indian mobile number';
    }

    if (!values.branch) {
        errors.branch = 'Please select your branch';
    } else if (!BRANCH_OPTIONS.includes(values.branch)) {
        errors.branch = 'Please select a valid branch from the list';
    } else if (isOtherBranch) {
        // Picking the escape hatch without saying what the branch is leaves the
        // record unusable, so the free-text box becomes mandatory.
        if (!values.branchOther) {
            errors.branchOther = 'Please type your branch';
        } else if (values.branchOther.length < 2) {
            errors.branchOther = 'Please type your full branch name';
        } else if (values.branchOther.length > FIELD_LIMITS.branchOther) {
            errors.branchOther = `Keep it under ${FIELD_LIMITS.branchOther} characters`;
        }
    }

    if (!values.gender) {
        errors.gender = 'Please select your gender';
    } else if (!GENDER_VALUES.includes(values.gender)) {
        errors.gender = 'Please select a valid option';
    }

    if (!values.residenceType) {
        errors.residenceType = 'Please select hosteler or day scholar';
    } else if (!RESIDENCE_VALUES.includes(values.residenceType)) {
        errors.residenceType = 'Please select a valid option';
    }

    if (!values.hasLaptop) {
        errors.hasLaptop = 'Please let us know if you have a laptop';
    } else if (!LAPTOP_VALUES.includes(values.hasLaptop)) {
        errors.hasLaptop = 'Please select a valid option';
    }

    // CRT enrolment field retired — validation kept commented for easy restore.
    // if (!values.paidCrtFee) {
    //     errors.paidCrtFee = 'Please let us know if you have enrolled to CRT';
    // } else if (!CRT_FEE_VALUES.includes(values.paidCrtFee)) {
    //     errors.paidCrtFee = 'Please select a valid option';
    // }

    if (!program) {
        errors.programKey = 'Please select a program';
    } else if (!program.open) {
        errors.programKey = `Registrations for ${program.programName} are now closed`;
    }

    // Academic details — mandatory for programs that collect them.
    //
    // How the student joined is asked FIRST and decides which CGPA is required:
    // a regular student reports their B.Tech CGPA, a lateral-entry student
    // joined at 2nd year from a diploma and reports the diploma CGPA. Asking
    // both of everyone would demand a number half of them do not have, so only
    // the applicable one is validated — and only it is stored.
    if (program?.academics) {
        if (!admissionType) {
            errors.admissionType = 'Please tell us how you joined';
        } else if (!ADMISSION_TYPES.includes(admissionType)) {
            errors.admissionType = 'Please select a valid option';
        } else if (isLateral) {
            if (!diplomaText) {
                errors.diplomaCgpa = 'Please enter your overall diploma CGPA';
            } else if (!CGPA_PATTERN.test(diplomaText) || Number(diplomaText) > 10) {
                errors.diplomaCgpa = 'Enter a CGPA between 0 and 10 (for example 8.25)';
            }
        } else {
            if (!cgpaText) {
                errors.cgpa = 'Please enter your overall CGPA';
            } else if (!CGPA_PATTERN.test(cgpaText) || Number(cgpaText) > 10) {
                errors.cgpa = 'Enter a CGPA between 0 and 10 (for example 8.25)';
            }
        }

        // Backlogs are asked of everyone, whichever way they joined.
        if (!backlogText) {
            errors.activeBacklogs = 'Enter your active backlogs — 0 if none';
        } else if (!/^\d{1,2}$/.test(backlogText)) {
            errors.activeBacklogs = 'Enter a whole number (0 if none)';
        }
    }

    // Entrance ranks are optional — validated only when something was typed, so
    // leaving them blank is never an error.
    if (eapcetText && !/^\d{1,7}$/.test(eapcetText)) {
        errors.eapcetRank = 'Enter your rank as digits only';
    }
    if (jeeText && !/^\d{1,7}$/.test(jeeText)) {
        errors.jeeRank = 'Enter your rank as digits only';
    }

    // Class time slot — mandatory for programs that offer them (Moon Coder).
    if (program?.timeSlots) {
        if (!slotText) {
            errors.timeSlot = 'Please choose your class time slot';
        } else if (!slot) {
            errors.timeSlot = 'Please choose one of the offered time slots';
        }
    }

    // Study year — mandatory for an intake that spans years (Moon Coder), where
    // it is the only thing that can produce a passout year. Missing it would
    // otherwise write the program's fallback year onto a final-year student.
    if (program?.studyYears) {
        if (!studyYearText) {
            errors.studyYear = 'Please select your current year';
        } else if (!studyYear) {
            errors.studyYear = 'Please select one of the listed years';
        }
    }

    return { values, errors, program };
}
