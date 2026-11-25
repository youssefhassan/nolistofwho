// Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { createCounter, stateOf, rollUp } from '../src/lib/server/counter.js';
import { createGuard } from '../src/lib/server/guard.js';
import { makeWords, readWords, ticketInput, makeTicket, leadingZeroBits } from '../src/lib/ticket.js';
import { WORDS } from '../src/lib/wordlist.js';

const T1 = 'a'.repeat(64);
const T2 = 'b'.repeat(64);
const KNOWN = new Set(WORDS);
const fresh = () => createCounter(new DatabaseSync(':memory:'), { batchSeconds: 0 });

test('the word list is the EFF large list: 7,776 different words', () => {
	assert.equal(WORDS.length, 7776);
	assert.equal(KNOWN.size, 7776);
});

test('six words, all from the list, and different every time', () => {
	const a = makeWords(WORDS);
	const b = makeWords(WORDS);
	assert.equal(a.length, 6);
	assert.ok(a.every((w) => KNOWN.has(w)));
	assert.notDeepEqual(a, b);
});

test('words are read back however they are typed', () => {
	const w = ['abacus', 'abdomen', 'zoology', 'cider', 'gravel', 'pebble'];
	assert.deepEqual(readWords('Abacus abdomen,  ZOOLOGY\ncider. gravel · pebble', KNOWN), w);
	assert.equal(readWords('abacus abdomen zoology cider gravel', KNOWN), null); // five
	assert.equal(readWords('abacus abdomen zoology cider gravel notaword', KNOWN), null);
});

test('ticket: same words give the same ticket; another action or another word gives another', async () => {
	const w = ['abacus', 'abdomen', 'zoology', 'cider', 'gravel', 'pebble'];
	const a = await makeTicket(w, 'attention-strike-2026');
	const b = await makeTicket(readWords('ABACUS abdomen zoology cider gravel pebble', KNOWN), 'attention-strike-2026');
	const c = await makeTicket(w, 'x-leave');
	const d = await makeTicket([...w.slice(0, 5), 'lantern'], 'attention-strike-2026');
	assert.match(a, /^[0-9a-f]{64}$/);
	assert.equal(a, b);
	assert.notEqual(a, c);
	assert.notEqual(a, d);
	assert.notEqual(ticketInput(w, 's1'), ticketInput(w, 's2'));
});

test('a ticket counts once', () => {
	const c = fresh();
	assert.equal(c.join('attention-strike-2026', T1, { today: '2026-11-20' }), 'counted');
	assert.equal(c.join('attention-strike-2026', T1, { today: '2026-11-21' }), 'already');
	assert.equal(c.join('attention-strike-2026', T2, { today: '2026-11-21' }), 'counted');
	assert.deepEqual(c.numbers().counts['attention-strike-2026'], { in: 2, did: 0 });
});

test('in before the day, did it on the day, with one ticket', () => {
	const c = fresh();
	c.join('attention-strike-2026', T1, { today: '2026-11-20' });
	assert.equal(c.join('attention-strike-2026', T1, { today: '2026-11-27' }), 'did_it');
	assert.equal(c.join('attention-strike-2026', T1, { today: '2026-11-27' }), 'already');
	assert.deepEqual(c.numbers().counts['attention-strike-2026'], { in: 1, did: 1 });
});

test('"I did it yesterday" works on the day after, then the count closes', () => {
	const c = fresh();
	assert.equal(c.join('attention-strike-2026', T1, { today: '2026-11-28' }), 'counted');
	assert.equal(c.join('attention-strike-2026', T2, { today: '2026-11-29' }), 'closed');
});

test('a step is always open and counts as done', () => {
	const c = fresh();
	assert.equal(c.join('amazon-cancel-prime', T1, { today: '2026-11-20' }), 'counted');
	assert.deepEqual(c.numbers().counts['amazon-cancel-prime'], { in: 1, did: 1 });
});

test('bad tickets and unknown actions are refused', () => {
	const c = fresh();
	assert.equal(c.join('attention-strike-2026', 'not-a-ticket'), 'bad_ticket');
	assert.equal(c.join('attention-strike-2026', 'A'.repeat(64)), 'bad_ticket');
	assert.equal(c.join('no-such-action', T1), 'unknown');
});

test('sums are added once, capped, and only the known ones', () => {
	const c = fresh();
	c.join('amazon-delete-2026', T1, { today: '2026-11-27', sums: { addresses: 2, payment_methods: 999, shoe_size: 44 } });
	c.join('amazon-delete-2026', T1, { today: '2026-11-27', sums: { addresses: 5 } });
	assert.deepEqual(c.numbers().totals['amazon-delete-2026'], { addresses: 2, payment_methods: 10 });
});

test('the public numbers move in batches', () => {
	const c = createCounter(new DatabaseSync(':memory:'), { batchSeconds: 300, clock: false });
	assert.equal(c.numbers(0).counts['x-leave'], undefined);
	c.join('x-leave', T1, { today: '2026-11-20' });
	assert.equal(c.numbers(299_000).counts['x-leave'], undefined);
	assert.equal(c.numbers(300_000).counts['x-leave'].in, 1);
});

test('batches follow the clock, and a page can say when the next one is', () => {
	const c = createCounter(new DatabaseSync(':memory:'), { batchSeconds: 300, clock: false });
	assert.equal(c.nextUpdate(Date.UTC(2026, 10, 27, 21, 3, 10)), Date.UTC(2026, 10, 27, 21, 5));
	assert.equal(c.nextUpdate(Date.UTC(2026, 10, 27, 21, 5)), Date.UTC(2026, 10, 27, 21, 10));
	c.numbers(Date.UTC(2026, 10, 27, 21, 4, 59));
	c.join('x-leave', T1, { today: '2026-11-20' });
	assert.equal(c.numbers(Date.UTC(2026, 10, 27, 21, 4, 59, 999)).counts['x-leave'], undefined);
	assert.equal(c.numbers(Date.UTC(2026, 10, 27, 21, 5)).counts['x-leave'].in, 1);
});

test('states by date, Anywhere on Earth', () => {
	const day = { kind: 'day', date: '2026-11-27' };
	const at = (iso) => new Date(iso);
	assert.equal(stateOf(day, at('2026-11-26T09:59:00Z')), 'upcoming'); // still Thursday everywhere
	assert.equal(stateOf(day, at('2026-11-26T10:00:00Z')), 'today'); // Friday has begun in Kiribati (UTC+14)
	assert.equal(stateOf(day, at('2026-11-28T23:00:00Z')), 'today'); // "I did it yesterday"
	assert.equal(stateOf(day, at('2026-11-29T11:59:00Z')), 'today'); // Saturday not yet over at UTC-12
	assert.equal(stateOf(day, at('2026-11-29T12:00:00Z')), 'past');
	assert.equal(stateOf(day, '2026-11-25'), 'upcoming');
	assert.equal(stateOf({ kind: 'step' }, '2030-01-01'), 'open');
});

test('Sydney on strike morning can already say "I did it"', () => {
	const c = fresh();
	// Fri Nov 27, 08:00 in Sydney (UTC+11) is Thu Nov 26, 21:00 UTC.
	assert.equal(c.join('attention-strike-2026', T1, { today: '2026-11-26', now: new Date('2026-11-26T21:00:00Z') }), 'counted');
	assert.deepEqual(c.numbers().counts['attention-strike-2026'], { in: 1, did: 1 });
});

test('city is tidied, and kept only with a country', () => {
	const c = fresh();
	c.join('x-leave', T1, { today: '2026-11-20', country: 'EG', city: '  new   CAIRO ' });
	c.join('x-leave', T2, { today: '2026-11-20', city: 'Berlin' });
	const rows = c.areas('2026-11-20')['x-leave'];
	assert.deepEqual(rows, [{ country: null, city: null, n: 2 }]); // under 10: nothing is shown on its own
});

test('10 or more: an area shows only from 10, and no remainder is ever under 10', () => {
	const rows = rollUp([
		{ country: 'DE', city: 'Berlin', n: 41 },
		{ country: 'DE', city: 'Leipzig', n: 12 },
		{ country: 'DE', city: 'Bonn', n: 3 },
		{ country: 'EG', city: 'Cairo', n: 15 },
		{ country: 'EG', city: null, n: 2 },
		{ country: 'FR', city: 'Paris', n: 4 },
		{ country: null, city: null, n: 30 }
	]);
	assert.deepEqual(rows, [
		{ country: 'DE', city: 'Berlin', n: 41 },
		{ country: 'DE', city: null, n: 15 }, // Bonn's 3 would be a remainder of 3, so Leipzig folds in with it
		{ country: 'EG', city: null, n: 17 }, // Cairo 15 would leave a remainder of 2, so it folds in
		{ country: null, city: null, n: 34 } // France's 4 joins "elsewhere"
	]);
	for (const r of rows) assert.ok(r.n >= 10);
});

test('removals count publicly', () => {
	const c = fresh();
	c.join('x-leave', T1, { today: '2026-11-20', country: 'DE' });
	c.join('x-leave', T2, { today: '2026-11-20', country: 'DE' });
	assert.equal(c.remove('x-leave', { day: '2026-11-20', country: 'DE' }), 2);
	assert.equal(c.numbers().removed['x-leave'], 2);
	assert.equal(c.numbers().counts['x-leave'], undefined);
});

test('puzzle: solved once works, twice or forged does not', () => {
	const g = createGuard({ bits: 8 });
	const p = g.puzzle();
	let answer = 0;
	while (leadingZeroBits(createHash('sha256').update(p.salt + ':' + answer).digest()) < 8) answer++;
	assert.equal(g.checkPuzzle({ ...p, answer: answer + (answer === 0 ? 0 : 0) }), true);
	assert.equal(g.checkPuzzle({ ...p, answer }), false); // spent
	const q = g.puzzle();
	assert.equal(g.checkPuzzle({ ...q, signature: 'ab'.repeat(32), answer: 0 }), false);
});

test('rate limit: per address, forgotten every ten minutes', () => {
	let t = 0;
	const g = createGuard({ limit: 2, now: () => t });
	assert.equal(g.allow('1.2.3.4'), true);
	assert.equal(g.allow('1.2.3.4'), true);
	assert.equal(g.allow('1.2.3.4'), false);
	assert.equal(g.allow('5.6.7.8'), true);
	t = 10 * 60 * 1000;
	assert.equal(g.allow('1.2.3.4'), true);
});

test('staging by default; a database keeps its stage and refuses the other one', async () => {
	const { stageFrom, checkStage, pretendToday } = await import('../src/lib/server/stage.js');
	assert.equal(stageFrom({}), 'staging');
	assert.equal(stageFrom({ COUNTER_STAGE: 'prod' }), 'staging');
	assert.equal(stageFrom({ COUNTER_STAGE: 'live' }), 'live');
	const db = new DatabaseSync(':memory:');
	assert.equal(checkStage(db, 'staging'), 'staging');
	assert.equal(checkStage(db, 'staging'), 'staging');
	assert.throws(() => checkStage(db, 'live'), /staging data/);
	assert.equal(pretendToday('staging', { COUNTER_TODAY: '2026-11-27' }), '2026-11-27');
	assert.equal(pretendToday('live', { COUNTER_TODAY: '2026-11-27' }), null);
	assert.equal(pretendToday('staging', { COUNTER_TODAY: 'tomorrow' }), null);
});

test('calendar: dated actions only, all-day, folded lines, staging says so', async () => {
	const { calendar, fold } = await import('../src/lib/calendar.js');
	const c = fresh();
	const ics = calendar(c.listActions(), { origin: 'https://nolistofwho.org', staging: true, stamp: new Date('2026-11-17T12:00:00Z') });
	assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
	assert.match(ics, /X-WR-CALNAME:No list of who \(staging: test build\)/);
	assert.match(ics, /UID:attention-strike-2026@nolistofwho.org\r\n/);
	assert.match(ics, /DTSTART;VALUE=DATE:20261127\r\nDTEND;VALUE=DATE:20261128/);
	assert.doesNotMatch(ics, /amazon-cancel-prime/); // a step has no date
	for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
	assert.equal(fold('é'.repeat(50)).split('\r\n ').join(''), 'é'.repeat(50));
});

// ---- Rounds: weekly actions, actions that last several days, counting ahead (Nov 17) ----
import { currentRound, pastRounds, roundState } from '../src/lib/server/counter.js';

const tuesdays = { slug: 't', kind: 'day', repeat: 'weekly', date: '2026-12-01', days: 1 };
const at = (iso) => new Date(iso);

test('weekly: one round open at a time, the next one as soon as the day has ended everywhere', () => {
	assert.equal(currentRound(tuesdays, at('2026-11-20T12:00:00Z')).start, '2026-12-01');
	assert.equal(roundState(currentRound(tuesdays, at('2026-11-20T12:00:00Z')), at('2026-11-20T12:00:00Z')), 'upcoming');
	assert.equal(stateOf(tuesdays, at('2026-12-01T09:00:00Z')), 'today');
	assert.equal(currentRound(tuesdays, at('2026-12-02T11:59:00Z')).start, '2026-12-01'); // still Tuesday at UTC-12
	assert.equal(currentRound(tuesdays, at('2026-12-02T12:00:00Z')).start, '2026-12-08'); // Tuesday is over everywhere: "I'm in" for the next one
	assert.equal(stateOf(tuesdays, at('2026-12-02T12:00:00Z')), 'upcoming');
	assert.equal(currentRound(tuesdays, at('2026-12-02T19:00:00Z')).start, '2026-12-08'); // Wednesday evening in Berlin never says last Tuesday
	assert.equal(currentRound(tuesdays, at('2027-06-01T12:00:00Z')).start, '2027-06-01'); // no end: it goes on
});

test('weekly: it ends with its last round', () => {
	const sundays = { kind: 'day', repeat: 'weekly', date: '2026-12-13', until: '2027-01-17' };
	assert.equal(currentRound(sundays, at('2027-01-18T11:00:00Z')).start, '2027-01-17');
	assert.equal(currentRound(sundays, at('2027-01-19T12:00:00Z')), null);
	assert.equal(stateOf(sundays, at('2027-01-19T12:00:00Z')), 'past');
	assert.deepEqual(pastRounds(sundays, at('2027-02-01T12:00:00Z')), ['2027-01-17', '2027-01-10', '2027-01-03', '2026-12-27', '2026-12-20', '2026-12-13']);
});

test('weekly: the history lists closed rounds only, newest first', () => {
	assert.deepEqual(pastRounds(tuesdays, at('2026-11-20T12:00:00Z')), []);
	assert.deepEqual(pastRounds(tuesdays, at('2026-12-15T12:00:00Z')), ['2026-12-08', '2026-12-01']);
});

test('a round of several days: in before and during, did it on the last day', () => {
	const month = { kind: 'day', date: '2026-12-01', days: 31 };
	const r = currentRound(month, at('2026-12-10T12:00:00Z'));
	assert.deepEqual([r.start, r.end], ['2026-12-01', '2026-12-31']);
	assert.equal(roundState(r, at('2026-11-20T12:00:00Z')), 'upcoming');
	assert.equal(roundState(r, at('2026-12-10T12:00:00Z')), 'running');
	assert.equal(roundState(r, at('2026-12-31T12:00:00Z')), 'today');
	assert.equal(roundState(r, at('2027-01-02T12:00:00Z')), 'past');
});

test('counting ahead: in during the week, did it on the day, one ticket per round', () => {
	const c = fresh();
	assert.equal(c.join('instagram-tuesdays', T1, { round: '2026-12-01', today: '2026-11-28' }), 'counted');
	assert.equal(c.join('instagram-tuesdays', T1, { round: '2026-12-01', today: '2026-12-01' }), 'did_it');
	assert.equal(c.join('instagram-tuesdays', T1, { round: '2026-12-01', today: '2026-12-01' }), 'already');
	assert.deepEqual(c.countOf('instagram-tuesdays', '2026-12-01'), { in: 1, did: 1 });
	// The next round is a new count; the same ticket would be new there (in real use, the ticket differs too).
	assert.equal(c.join('instagram-tuesdays', T1, { round: '2026-12-08', today: '2026-12-05' }), 'counted');
	assert.deepEqual(c.countOf('instagram-tuesdays', '2026-12-08'), { in: 1, did: 0 });
});

test('a ticket for another round is refused', () => {
	const c = fresh();
	assert.equal(c.join('instagram-tuesdays', T1, { round: '2026-12-08', today: '2026-11-28' }), 'closed'); // not open yet
	assert.equal(c.join('instagram-tuesdays', T1, { today: '2026-11-28' }), 'closed'); // no round given
	assert.equal(c.join('x-sundays', T1, { round: '2026-12-13', today: '2026-12-16' }), 'closed'); // that round is over
	assert.equal(c.join('attention-strike-2026', T1, { round: '2026-11-27', today: '2026-11-20' }), 'closed'); // a one-time action has no round
});

test('the same words make a different ticket every round', async () => {
	const w = ['abacus', 'abdomen', 'zoology', 'cider', 'gravel', 'pebble'];
	const a = await makeTicket(w, 'instagram-tuesdays', '2026-12-01');
	const b = await makeTicket(w, 'instagram-tuesdays', '2026-12-08');
	assert.notEqual(a, b);
	assert.equal(ticketInput(w, 'x-leave'), ticketInput(w, 'x-leave', '')); // one-time actions: unchanged
});

test('an older file is brought up to date, its entries kept', () => {
	const db = new DatabaseSync(':memory:');
	db.exec(`CREATE TABLE actions (slug TEXT PRIMARY KEY, title TEXT NOT NULL, ask TEXT NOT NULL, company TEXT NOT NULL, kind TEXT NOT NULL,
		called_by TEXT, called_by_url TEXT, date TEXT, next TEXT, sort INTEGER NOT NULL DEFAULT 0);
		CREATE TABLE entries (action_slug TEXT NOT NULL, ticket TEXT NOT NULL, country TEXT, postal_code TEXT, day TEXT NOT NULL,
		did_it INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (action_slug, ticket)) WITHOUT ROWID;
		INSERT INTO entries VALUES ('x-leave', '${T1}', 'DE', NULL, '2026-11-17', 0);`);
	const c = createCounter(db, { batchSeconds: 0 });
	assert.deepEqual(c.numbers().counts['x-leave'], { in: 1, did: 0 });
	assert.equal(c.join('x-leave', T1, { today: '2026-11-20' }), 'already');
	assert.equal(c.getAction('x-sunday-1'), null); // replaced by x-sundays
	assert.equal(c.getAction('x-sundays').repeat, 'weekly');
});

test('calendar: a weekly action repeats, with its end', async () => {
	const { calendar } = await import('../src/lib/calendar.js');
	const ics = calendar(fresh().listActions(), { origin: 'https://nolistofwho.org' });
	assert.match(ics, /UID:x-sundays@nolistofwho.org\r\nDTSTAMP:\d{8}T\d{6}Z\r\nDTSTART;VALUE=DATE:20261122\r\nDTEND;VALUE=DATE:20261123\r\nRRULE:FREQ=WEEKLY;UNTIL=20270117\r\n/);
	assert.match(ics, /UID:instagram-tuesdays@nolistofwho.org[\s\S]*?RRULE:FREQ=WEEKLY\r\n/);
});

// ---- Added Nov 18 after the three-persona test ----
import { cleanCountry, cleanCity, cleanPostal } from '../src/lib/area.js';
import { network } from '../src/lib/server/guard.js';

test('area checks are strict: countries from our list, plain place names, plain postal codes', () => {
	assert.equal(cleanCountry('DE'), 'DE');
	assert.equal(cleanCountry('FU'), null);
	assert.equal(cleanCountry('__proto__'), null);
	assert.equal(cleanCity(' bad  homburg '), 'Bad Homburg');
	assert.equal(cleanCity("saint-jean-d'angély"), "Saint-Jean-D'angély");
	assert.equal(cleanCity('القاهرة'), 'القاهرة');
	for (const bad of ['B', 'Berlin1', '<b>x</b>', 'a\u0000b', 'ab‮cd', 'a​b', 'x@y', 'a--b', '" Onmouseover="alert', 'a' + '́'.repeat(38), 'x'.repeat(41), 42, null])
		assert.equal(cleanCity(bad), null, String(bad));
	assert.equal(cleanPostal(' sw1a 1aa '), 'SW1A 1AA');
	assert.equal(cleanPostal('10997'), '10997');
	for (const bad of ['1', '1--2', "1'; DROP", '12345678901', '١٢٣٤٥', null]) assert.equal(cleanPostal(bad), null, String(bad));
});

test('only countries are shown, never a city someone typed', () => {
	const db = new DatabaseSync(':memory:');
	const c = createCounter(db, { batchSeconds: 0 });
	for (let i = 0; i < 12; i++) c.join('amazon-cancel-prime', i.toString(16).padStart(64, '0'), { country: 'DE', city: 'Youssef Is A Fraud', today: '2026-11-18' });
	c.join('amazon-cancel-prime', 'f'.repeat(64), { country: 'FU', city: 'X', today: '2026-11-18' });
	const rows = c.areas('2026-11-18')['amazon-cancel-prime'];
	assert.ok(rows.every((r) => r.city === null));
	assert.equal(rows.reduce((s, r) => s + r.n, 0), 13);
	assert.ok(!rows.some((r) => r.country === 'FU'));
});

test('a removal from another process clears the shown areas at once', () => {
	const db = new DatabaseSync(':memory:');
	const c = createCounter(db, { batchSeconds: 300, clock: false });
	for (let i = 0; i < 12; i++) c.join('amazon-cancel-prime', i.toString(16).padStart(64, '0'), { country: 'DE', today: '2026-11-18' });
	assert.equal(c.areas('2026-11-18')['amazon-cancel-prime'][0].n, 12);
	// What scripts/remove.js does, without telling this counter object:
	db.prepare("DELETE FROM entries WHERE action_slug = 'amazon-cancel-prime'").run();
	db.prepare("INSERT INTO removals (action_slug, count) VALUES ('amazon-cancel-prime', 12)").run();
	assert.equal(c.areas('2026-11-18')['amazon-cancel-prime'], undefined);
});

test('the rate limit counts an IPv6 /64 as one, and IPv4 as itself', () => {
	assert.equal(network('2a0b:20c0:2000:62:be24:11ff:fe7c:4e02'), network('2a0b:20c0:2000:62::1'));
	assert.notEqual(network('2a0b:20c0:2000:62::1'), network('2a0b:20c0:2000:63::1'));
	assert.equal(network('::ffff:203.0.113.7'), '203.0.113.7');
	assert.equal(network('203.0.113.7'), '203.0.113.7');
	const g = createGuard({ limit: 2 });
	assert.ok(g.allow('2001:db8:1:2::a'));
	assert.ok(g.allow('2001:db8:1:2::b'));
	assert.equal(g.allow('2001:db8:1:2:ffff::c'), false);
	assert.ok(g.allow('2001:db8:1:3::a'));
});

test('takenAt is the real moment the numbers were read, not the five-minute mark', () => {
	const c = createCounter(new DatabaseSync(':memory:'), { batchSeconds: 300, clock: false });
	const mark = 300_000 * 1000; // a five-minute mark
	// A restart in the middle of a window: the first read happens 2 minutes after the mark.
	assert.equal(c.takenAt(mark + 120_000), mark + 120_000);
	// Later in the same window the same numbers are still on show.
	assert.equal(c.takenAt(mark + 200_000), mark + 120_000);
	// At the next mark they are read again.
	assert.equal(c.takenAt(mark + 300_000), mark + 300_000);
});

test('the pause switch: by hand with a file, and by itself in a flood', async () => {
	const { createPause } = await import('../src/lib/server/pause.js');
	let t = 1_000_000_000;
	let file = false;
	const p = createPause({ file: '/x/PAUSE', perMinute: 3, holdMinutes: 15, now: () => t, exists: () => file });
	assert.equal(p.paused(), false);
	// By hand: the file appears; it is noticed within five seconds, and released the same way.
	file = true;
	assert.equal(p.paused(), false);
	t += 5000;
	assert.equal(p.paused(), 'hand');
	file = false;
	t += 5000;
	assert.equal(p.paused(), false);
	// A flood: more than 3 new tickets in one minute pauses for 15 minutes.
	t = Math.ceil(t / 60_000) * 60_000;
	for (let i = 0; i < 3; i++) p.counted();
	assert.equal(p.paused(), false);
	p.counted();
	assert.equal(p.paused(), 'flood');
	t += 14 * 60_000;
	assert.equal(p.paused(), 'flood');
	t += 61_000;
	assert.equal(p.paused(), false);
	// A steady crowd under the limit never trips it.
	for (let m = 0; m < 5; m++) {
		t += 60_000;
		for (let i = 0; i < 3; i++) p.counted();
	}
	assert.equal(p.paused(), false);
});

// ---- Added Nov 24 after the code review ----

test('city and postal code are never stored next to a ticket, only as counts', () => {
	const db = new DatabaseSync(':memory:');
	const c = createCounter(db, { batchSeconds: 0 });
	c.join('x-leave', T1, { today: '2026-11-20', country: 'DE', city: 'Berlin', postalCode: '10437' });
	c.join('x-leave', T2, { today: '2026-11-20', country: 'DE', city: 'Berlin', postalCode: '10437' });
	const cols = db.prepare('PRAGMA table_info(entries)').all().map((r) => r.name);
	assert.deepEqual(cols.sort(), ['action_slug', 'country', 'day', 'did_it', 'round', 'ticket']);
	const placeCols = db.prepare('PRAGMA table_info(places)').all().map((r) => r.name);
	assert.ok(!placeCols.includes('ticket') && !placeCols.includes('day'));
	assert.deepEqual({ ...db.prepare('SELECT country, city, postal_code, n FROM places').get() }, { country: 'DE', city: 'Berlin', postal_code: '10437', n: 2 });
	// A second press of the same ticket adds nothing to places.
	c.join('x-leave', T1, { today: '2026-11-20', country: 'DE', city: 'Berlin', postalCode: '10437' });
	assert.equal(db.prepare('SELECT n FROM places').get().n, 2);
});

test('an older file: city and postal code move out of the entries into counts', () => {
	const db = new DatabaseSync(':memory:');
	db.exec(`CREATE TABLE entries (action_slug TEXT NOT NULL, round TEXT NOT NULL DEFAULT '', ticket TEXT NOT NULL, country TEXT, city TEXT,
		postal_code TEXT, day TEXT NOT NULL, did_it INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (action_slug, round, ticket)) WITHOUT ROWID;
		INSERT INTO entries VALUES ('x-leave', '', '${T1}', 'DE', 'Berlin', '10437', '2026-11-17', 0);
		INSERT INTO entries VALUES ('x-leave', '', '${T2}', 'DE', 'Berlin', '10437', '2026-11-18', 0);
		INSERT INTO entries VALUES ('x-leave', '', '${'c'.repeat(64)}', 'EG', NULL, NULL, '2026-11-18', 0);`);
	const c = createCounter(db, { batchSeconds: 0 });
	const cols = db.prepare('PRAGMA table_info(entries)').all().map((r) => r.name);
	assert.ok(!cols.includes('city') && !cols.includes('postal_code'));
	assert.deepEqual(c.numbers().counts['x-leave'], { in: 3, did: 0 });
	assert.deepEqual(db.prepare('SELECT country, city, postal_code, n FROM places').all().map((r) => ({ ...r })), [{ country: 'DE', city: 'Berlin', postal_code: '10437', n: 2 }]);
	assert.equal(c.join('x-leave', T1, { today: '2026-11-20' }), 'already');
});

test('the pause also goes on for a slow flood: too many in one hour', async () => {
	const { createPause } = await import('../src/lib/server/pause.js');
	let t = 3_600_000 * 1000;
	const p = createPause({ perMinute: 100, perHour: 50, holdMinutes: 15, now: () => t });
	for (let m = 0; m < 10; m++) {
		for (let i = 0; i < 5; i++) p.counted();
		t += 60_000;
	}
	assert.equal(p.paused(), false); // 50 in the hour, at the limit
	p.counted();
	assert.equal(p.paused(), 'flood');
});
