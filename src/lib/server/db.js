// Opens the one database file and hands out the one counter and the one guard. Server only.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createCounter, dayOf } from './counter.js';
import { createGuard } from './guard.js';
import { createPause } from './pause.js';
import { stageFrom, checkStage, pretendToday } from './stage.js';

export const stage = stageFrom();
const path = process.env.COUNTER_DB ?? (stage === 'live' ? './data/counter.db' : './data/staging.db');
if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });

export const db = new DatabaseSync(path);
db.exec('PRAGMA journal_mode = WAL;');
// Deleted rows are overwritten with zeros, not left in the file's free space.
db.exec('PRAGMA secure_delete = ON;');
checkStage(db, stage);

const pretend = pretendToday(stage);
/** Today, as the counter sees it: the real day, or in staging the pretend one. */
export const today = () => pretend ?? dayOf();
/** The moment used for open and closed: now, or in staging noon UTC of the pretend day. */
export const now = () => (pretend ? new Date(pretend + 'T12:00:00Z') : new Date());
export const pretending = pretend;

export const batchSeconds = process.env.COUNTER_BATCH_SECONDS ? Number(process.env.COUNTER_BATCH_SECONDS) : 300;

export const counter = createCounter(db, { batchSeconds });
export const guard = createGuard({
	bits: Number(process.env.COUNTER_PUZZLE_BITS ?? 16),
	limit: Number(process.env.COUNTER_RATE_LIMIT ?? 20)
});

/** The pause switch: a PAUSE file next to the database, or too many new tickets in one minute. */
export const pause = createPause({
	file: path === ':memory:' ? null : dirname(path) + '/PAUSE',
	perMinute: Number(process.env.COUNTER_PAUSE_PER_MINUTE ?? 300),
	perHour: Number(process.env.COUNTER_PAUSE_PER_HOUR ?? 3000),
	holdMinutes: Number(process.env.COUNTER_PAUSE_MINUTES ?? 15)
});
