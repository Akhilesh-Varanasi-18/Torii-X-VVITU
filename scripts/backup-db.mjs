/**
 * Full backup of the VVITU database.
 *
 *   node scripts/backup-db.mjs                 -> backups/<timestamp>/
 *   node scripts/backup-db.mjs --out my-folder
 *
 * Written with the driver rather than mongodump, which is not installed here
 * and would need the Atlas tools on every machine that ever has to take one.
 *
 * ── Why EJSON and not JSON.stringify ───────────────────────────────────────
 * The documents are not plain data. `_id` is an ObjectId, every `at`/`createdAt`
 * /`scoredAt` is a Date, and an announcement's poster is a Buffer. Plain JSON
 * flattens all three into strings and the restore silently comes back wrong —
 * dates as text that no longer compare, ids that no longer match. Canonical
 * Extended JSON keeps the types, so a dump round-trips exactly.
 *
 * Indexes are dumped beside the documents: restoring the rows without them
 * would lose the unique constraints that stop a student registering twice.
 *
 * ⚠️ The output is every student's name, roll number, email, mobile number and
 * interview remarks in one file. `.gitignore` blocks /backups/ — keep it that
 * way, and move these the way you move credentials, not over chat (§8.10).
 */
import fs from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';
import { EJSON } from 'bson';

const ROOT = process.cwd();

function env(key) {
    const file = path.join(ROOT, '.env.local');
    if (!fs.existsSync(file)) return process.env[key] || '';
    const m = fs.readFileSync(file, 'utf8').match(new RegExp(`^${key}=(.+)$`, 'm'));
    return (m ? m[1].trim() : process.env[key]) || '';
}

const arg = (flag) => {
    const i = process.argv.indexOf(flag);
    return i !== -1 ? process.argv[i + 1] : null;
};

// 'YYYY-MM-DD_HHmm' in IST, so a folder name reads as the time in Guntur (§8.8).
function stamp(now = new Date()) {
    return new Date(now.getTime() + 330 * 60 * 1000).toISOString().slice(0, 16).replace('T', '_').replace(':', '');
}

async function main() {
    const uri = env('MONGODB_URI');
    if (!uri) throw new Error('MONGODB_URI is not set — add it to .env.local.');
    const dbName = env('MONGODB_DB') || 'vvitu';

    const outDir = path.join(ROOT, 'backups', arg('--out') || stamp());
    fs.mkdirSync(outDir, { recursive: true });

    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
    await client.connect();
    const db = client.db(dbName);

    const names = (await db.listCollections().toArray()).map((c) => c.name).sort();
    const manifest = { database: dbName, takenAt: new Date().toISOString(), collections: [] };
    let docTotal = 0;
    let byteTotal = 0;

    for (const name of names) {
        const col = db.collection(name);
        const docs = await col.find({}).toArray();
        const indexes = await col.indexes();

        const docFile = path.join(outDir, `${name}.json`);
        const idxFile = path.join(outDir, `${name}.indexes.json`);
        // relaxed:false => canonical EJSON, the form that round-trips types.
        fs.writeFileSync(docFile, EJSON.stringify(docs, null, 2, { relaxed: false }));
        fs.writeFileSync(idxFile, JSON.stringify(indexes, null, 2));

        const bytes = fs.statSync(docFile).size;
        docTotal += docs.length;
        byteTotal += bytes;
        manifest.collections.push({ name, documents: docs.length, bytes, indexes: indexes.length });
        console.log(`  ${name.padEnd(26)} ${String(docs.length).padStart(6)} docs  ${(bytes / 1024).toFixed(0).padStart(7)} KB  ${indexes.length} indexes`);
    }

    manifest.totals = { documents: docTotal, bytes: byteTotal };
    fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

    fs.writeFileSync(
        path.join(outDir, 'README.md'),
        [
            `# VVITU database backup — ${manifest.takenAt}`,
            '',
            `Database: \`${dbName}\`  ·  ${docTotal} documents  ·  ${(byteTotal / 1024 / 1024).toFixed(2)} MB`,
            '',
            '## Contents',
            '',
            ...manifest.collections.map((c) => `- \`${c.name}.json\` — ${c.documents} documents, ${c.indexes} indexes`),
            '',
            'Documents are **canonical Extended JSON**, so ObjectIds, Dates and Buffers',
            'survive the round trip. Plain `JSON.parse` would turn them into strings —',
            'read them with `EJSON.parse(text)` from the `bson` package.',
            '',
            '## Restoring',
            '',
            '```bash',
            '# everything, into the database in .env.local',
            'node scripts/restore-db.mjs backups/<folder>',
            '',
            '# one collection',
            'node scripts/restore-db.mjs backups/<folder> --only vvitu_registrations',
            '```',
            '',
            'The restore refuses to run against a non-empty collection unless you pass',
            '`--drop`, so it cannot quietly merge a backup into live data.',
            '',
            '## Handling',
            '',
            'This folder is every student\'s name, roll number, college email, mobile',
            'number and interview remarks. `.gitignore` blocks `/backups/`. Move it the',
            'way you move the Atlas credentials — not over chat, not into the repo.'
        ].join('\n')
    );

    console.log(`\n  ${docTotal} documents, ${(byteTotal / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  -> ${path.relative(ROOT, outDir)}`);
    await client.close();
}

main().catch((e) => {
    console.error('ERR', e.message);
    process.exit(1);
});
