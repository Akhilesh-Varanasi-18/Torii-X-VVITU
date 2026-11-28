/**
 * Restore a backup written by scripts/backup-db.mjs.
 *
 *   node scripts/restore-db.mjs backups/<folder> --dry-run
 *   node scripts/restore-db.mjs backups/<folder> --only vvitu_registrations
 *   node scripts/restore-db.mjs backups/<folder> --drop
 *
 * Defaults are deliberately timid, because the realistic moment somebody runs
 * this is a bad one:
 *
 *   • It targets whatever MONGODB_DB says, and prints that name before doing
 *     anything — restoring SRKR's dump over VVITU is the failure §3 warns about.
 *   • It REFUSES a collection that already has documents unless --drop is given.
 *     A restore that merges into live data is worse than one that does nothing:
 *     you end up with a mix nobody can unpick.
 *   • --dry-run says exactly what it would write and stops.
 *
 * Indexes are rebuilt from the `.indexes.json` beside each collection, so the
 * unique constraints come back with the rows rather than being left to the next
 * lazy first-access.
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
const has = (flag) => process.argv.includes(flag);

async function main() {
    const folder = process.argv[2];
    if (!folder || folder.startsWith('--')) throw new Error('Usage: node scripts/restore-db.mjs backups/<folder> [--only <collection>] [--drop] [--dry-run]');
    const dir = path.resolve(ROOT, folder);
    if (!fs.existsSync(dir)) throw new Error(`No such backup: ${dir}`);

    const manifestPath = path.join(dir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) throw new Error('That folder has no manifest.json — is it a backup?');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    const only = arg('--only');
    const drop = has('--drop');
    const dryRun = has('--dry-run');

    const uri = env('MONGODB_URI');
    if (!uri) throw new Error('MONGODB_URI is not set — add it to .env.local.');
    const dbName = env('MONGODB_DB') || 'vvitu';

    console.log(`backup taken : ${manifest.takenAt}  (from database "${manifest.database}")`);
    console.log(`restoring to : "${dbName}"`);
    if (manifest.database !== dbName) {
        console.log(`  !! the backup came from "${manifest.database}" and you are writing to "${dbName}".`);
    }
    console.log('');

    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
    await client.connect();
    const db = client.db(dbName);

    const wanted = manifest.collections.filter((c) => !only || c.name === only);
    if (!wanted.length) throw new Error(`"${only}" is not in this backup.`);

    const plan = [];
    for (const entry of wanted) {
        const existing = await db.collection(entry.name).countDocuments();
        plan.push({ ...entry, existing });
        const verdict = existing === 0 ? 'empty, safe to write' : drop ? `${existing} documents WILL BE DROPPED` : `${existing} documents — refusing without --drop`;
        console.log(`  ${entry.name.padEnd(26)} ${String(entry.documents).padStart(6)} docs in backup   ${verdict}`);
    }

    const blocked = plan.filter((p) => p.existing > 0 && !drop);
    if (blocked.length) {
        console.log('\nRefusing: a restore that merges into live data leaves a mix nobody can unpick.');
        console.log('Re-run with --drop once you are sure, or --only <collection> to do one at a time.');
        await client.close();
        process.exit(1);
    }

    if (dryRun) {
        console.log('\nDRY RUN — nothing written.');
        await client.close();
        return;
    }

    for (const entry of plan) {
        const docs = EJSON.parse(fs.readFileSync(path.join(dir, `${entry.name}.json`), 'utf8'));
        const col = db.collection(entry.name);
        if (entry.existing > 0) await col.deleteMany({});
        if (docs.length) {
            for (let i = 0; i < docs.length; i += 500) await col.insertMany(docs.slice(i, i + 500), { ordered: false });
        }

        const idxPath = path.join(dir, `${entry.name}.indexes.json`);
        let rebuilt = 0;
        if (fs.existsSync(idxPath)) {
            for (const idx of JSON.parse(fs.readFileSync(idxPath, 'utf8'))) {
                if (idx.name === '_id_') continue; // always there, cannot be recreated
                const { key, name, v, ns, ...opts } = idx;
                try {
                    await col.createIndex(key, { name, ...opts });
                    rebuilt++;
                } catch (e) {
                    console.log(`    index ${name} skipped: ${e.message.slice(0, 80)}`);
                }
            }
        }
        console.log(`  ${entry.name.padEnd(26)} restored ${await col.countDocuments()} docs, ${rebuilt} indexes`);
    }

    console.log('\ndone.');
    await client.close();
}

main().catch((e) => {
    console.error('ERR', e.message);
    process.exit(1);
});
