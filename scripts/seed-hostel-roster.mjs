/**
 * Seed the hostel roster — the eligibility list for AI Ready Engineers.
 *
 *   node scripts/seed-hostel-roster.mjs "2nd Year Hostel.xlsx"
 *   node scripts/seed-hostel-roster.mjs "<file>" --dry-run
 *
 * The college sends a spreadsheet of the students who may register. This loads
 * it into `vvitu_hostel_roster`, which /api/register/lookup searches and
 * /api/register verifies against.
 *
 * ── Why a script and not an admin upload page ────────────────────────────
 * The list changes once or twice a year, by hand, from a file a person emails.
 * A whole upload UI for that is machinery nobody maintains; a script that is
 * read in full before it is run is easier to trust with 1,400 real students.
 *
 * ── Replace, do not merge ────────────────────────────────────────────────
 * A re-seed REPLACES the roster: rows absent from the new file are removed, so
 * a student the college has taken off the list stops being eligible. Merging
 * would mean nobody could ever be removed, which is the wrong default for an
 * eligibility list. Registrations are a different collection and are never
 * touched — a student who already registered keeps their record even if they
 * later leave the roster.
 *
 * ⚠️ The spreadsheet holds real student names. `.gitignore` blocks *.xlsx —
 * keep it that way, and do not commit any file this script reads.
 */

import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ExcelJS = require('exceljs');
const { MongoClient } = require('mongodb');

const COLLECTION = 'vvitu_hostel_roster';

/**
 * Read .env.local by hand. Next.js loads it automatically; a plain node script
 * does not, and `dotenv` is not a dependency of this project — adding one just
 * to read four lines would be a worse trade than parsing them here.
 */
function loadEnvLocal() {
    const file = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
        const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
        if (!m) continue;                         // blank lines and # comments
        const [, key, rawValue] = m;
        if (process.env[key]) continue;           // a real env var always wins
        process.env[key] = rawValue.trim().replace(/^["']|["']$/g, '');
    }
}
loadEnvLocal();

// Column header -> field. Matched case/space-insensitively so a re-export with
// slightly different capitalisation still loads.
const HEADERS = {
    roll: ['roll no', 'rollno', 'roll number', 'rollnumber', 'regd no', 'registration number'],
    name: ['student name', 'name', 'studentname'],
    program: ['program', 'programme', 'branch', 'department'],
    year: ['academic year', 'year', 'academicyear'],
    gender: ['gender', 'sex'],
};

/**
 * College programme code -> the branch option the registration form offers.
 *
 * Seven of the nine map exactly. The form's own code is the LAST parenthetical
 * of its label, so "…(AIML)" is AIML.
 *
 * CAI and CAD are the college's own shorthand and are mapped by their roll-number
 * segment: a CAI student's roll reads ...DAIBT..., a CAD student's ...DADBT...,
 * i.e. AI and AI&DS. Anything unmapped is left BLANK rather than guessed — the
 * branch field stays editable precisely so a student can correct it, and a
 * wrong branch silently applied to 100+ students is worse than one they pick.
 */
const PROGRAM_TO_BRANCH_CODE = {
    'CSE': 'CSE',
    'CSE(AI&ML)': 'AIML',
    'CSE(AIML)': 'AIML',
    'CIC': 'CIC',
    'CAD': 'AIDS',
    'ECE': 'ECE',
    'EEE': 'EEE',
    'MEC': 'MECH',
    'CIV': 'CIVIL',
    // 'CAI' is deliberately absent — see the note above. Add it here once VVITU
    // confirms which of the form's branches it corresponds to.
};

const txt = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') {
        if (v.text) return String(v.text).trim();
        if (v.richText) return v.richText.map((p) => p.text).join('').trim();
        if (v.result !== undefined) return String(v.result).trim();
    }
    return String(v).trim();
};

const normaliseRoll = (v) => txt(v).toUpperCase().replace(/[^A-Z0-9]/g, '');
const foldName = (v) => txt(v).toUpperCase().replace(/\s+/g, ' ').trim();

/** "SAI KUMAR REDDY" -> "Sai Kumar Reddy". Leaves already-mixed names alone. */
const titleCase = (v) => {
    const s = txt(v);
    if (!s || s !== s.toUpperCase()) return s;
    return s.toLowerCase().replace(/(^|[\s.'-])([a-z])/g, (m, sep, ch) => sep + ch.toUpperCase());
};

function resolveColumns(headerRow) {
    const found = {};
    headerRow.forEach((raw, idx) => {
        const h = txt(raw).toLowerCase().replace(/\s+/g, ' ').trim();
        if (!h) return;
        for (const [field, names] of Object.entries(HEADERS)) {
            if (found[field] === undefined && names.includes(h)) found[field] = idx;
        }
    });
    return found;
}

async function main() {
    const file = process.argv[2];
    const dryRun = process.argv.includes('--dry-run');
    if (!file) {
        console.error('usage: node scripts/seed-hostel-roster.mjs "<spreadsheet.xlsx>" [--dry-run]');
        process.exit(1);
    }
    const abs = path.resolve(file);
    if (!fs.existsSync(abs)) { console.error('no such file:', abs); process.exit(1); }

    const uri = process.env.MONGODB_URI;
    if (!uri) { console.error('MONGODB_URI is not set (.env.local)'); process.exit(1); }
    const dbName = process.env.MONGODB_DB || 'vvitu';

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(abs);
    const ws = wb.worksheets[0];
    const headerRow = ws.getRow(1).values;
    const cols = resolveColumns(headerRow);

    if (cols.roll === undefined || cols.name === undefined) {
        console.error('could not find a roll-number and a name column. Headers seen:',
            headerRow.map(txt).filter(Boolean).join(' | '));
        process.exit(1);
    }

    const rows = [];
    const seen = new Map();
    const problems = { noRoll: 0, noName: 0, duplicate: 0, unmappedProgram: new Map() };

    for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const rollKey = normaliseRoll(row.getCell(cols.roll).value);
        const name = txt(row.getCell(cols.name).value);
        if (!rollKey) { problems.noRoll++; continue; }
        if (!name) { problems.noName++; continue; }
        if (seen.has(rollKey)) { problems.duplicate++; continue; }
        seen.set(rollKey, true);

        const program = cols.program !== undefined ? txt(row.getCell(cols.program).value) : '';
        const programKey = program.toUpperCase().replace(/\s+/g, '');
        const branchCode = PROGRAM_TO_BRANCH_CODE[programKey] || '';
        if (program && !branchCode) {
            problems.unmappedProgram.set(program, (problems.unmappedProgram.get(program) || 0) + 1);
        }

        const genderRaw = cols.gender !== undefined ? txt(row.getCell(cols.gender).value).toLowerCase() : '';
        const gender = genderRaw.startsWith('f') ? 'Female' : genderRaw.startsWith('m') ? 'Male' : '';

        rows.push({
            rollKey,
            rollNo: txt(row.getCell(cols.roll).value).toUpperCase(),
            name: titleCase(name),
            nameKey: foldName(name),
            program,
            branchCode,
            gender,
            academicYear: cols.year !== undefined ? txt(row.getCell(cols.year).value) : '',
            updatedAt: new Date()
        });
    }

    console.log(`read ${rows.length} eligible students from ${path.basename(abs)}`);
    if (problems.noRoll) console.log(`  skipped ${problems.noRoll} row(s) with no roll number`);
    if (problems.noName) console.log(`  skipped ${problems.noName} row(s) with no name`);
    if (problems.duplicate) console.log(`  skipped ${problems.duplicate} duplicate roll number(s)`);
    if (problems.unmappedProgram.size) {
        console.log('  programmes with no branch mapping (students will pick their own branch):');
        [...problems.unmappedProgram.entries()].forEach(([p, n]) => console.log(`    ${p}  x${n}`));
    }
    const withBranch = rows.filter((r) => r.branchCode).length;
    const withGender = rows.filter((r) => r.gender).length;
    console.log(`  branch pre-filled for ${withBranch}/${rows.length}, gender for ${withGender}/${rows.length}`);

    if (!rows.length) { console.error('nothing to write — aborting'); process.exit(1); }
    if (dryRun) { console.log('\n--dry-run: nothing written'); return; }

    const client = new MongoClient(uri);
    await client.connect();
    try {
        const col = client.db(dbName).collection(COLLECTION);
        await col.createIndex({ rollKey: 1 }, { unique: true, name: 'uniq_rollKey' });
        await col.createIndex({ nameKey: 1 }, { name: 'idx_nameKey' });

        const before = await col.countDocuments();
        // Replace, not merge. A student removed from the college's list must
        // stop being eligible, which a merge could never express.
        const ops = rows.map((doc) => ({
            replaceOne: { filter: { rollKey: doc.rollKey }, replacement: doc, upsert: true }
        }));
        for (let i = 0; i < ops.length; i += 500) {
            await col.bulkWrite(ops.slice(i, i + 500), { ordered: false });
        }
        const keep = rows.map((r) => r.rollKey);
        const removed = await col.deleteMany({ rollKey: { $nin: keep } });
        const after = await col.countDocuments();

        console.log(`\nroster: ${before} -> ${after} documents (${removed.deletedCount} removed as no longer listed)`);
    } finally {
        await client.close();
    }
}

main().catch((e) => { console.error(e); process.exit(1); });
