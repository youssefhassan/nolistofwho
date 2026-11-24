// Remove entries that are clearly abuse, and count them publicly as "fake entries removed".
// Entries hold only a day and an area, so removal works on a whole day (and area), never on a person.
//
//   node scripts/remove.js <action-slug> <YYYY-MM-DD> [COUNTRY] [City]          shows how many would go
//   node scripts/remove.js <action-slug> <YYYY-MM-DD> [COUNTRY] [City] --yes    removes them
import { DatabaseSync } from 'node:sqlite';
import { createCounter } from '../src/lib/server/counter.js';
import { stageFrom, checkStage } from '../src/lib/server/stage.js';

const args = process.argv.slice(2).filter((a) => a !== '--yes');
const yes = process.argv.includes('--yes');
const [slug, day, country, city] = args;
if (!slug || !/^\d{4}-\d{2}-\d{2}$/.test(day ?? '')) {
	console.log('Usage: node scripts/remove.js <action-slug> <YYYY-MM-DD> [COUNTRY] [City] [--yes]');
	process.exit(1);
}
const stage = stageFrom();
const db = new DatabaseSync(process.env.COUNTER_DB ?? (stage === 'live' ? './data/counter.db' : './data/staging.db'));
checkStage(db, stage);
let sql = 'SELECT COUNT(*) AS n FROM entries WHERE action_slug = ? AND day = ?';
const a = [slug, day];
if (country) { sql += ' AND country = ?'; a.push(country); }
if (city) { sql += ' AND city = ?'; a.push(city); }
const n = Number(db.prepare(sql).get(...a).n);
if (!yes) {
	console.log(`${n} entries match. Run again with --yes to remove them and add ${n} to the public count of removed entries.`);
} else {
	const removed = createCounter(db).remove(slug, { day, country, city });
	console.log(`Removed ${removed}. The page shows it after the next batch.`);
}
