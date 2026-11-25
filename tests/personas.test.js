// The three personas from TESTING-PERSONAS.md, as tests that run every time (Nov 24, 2026).
// Most of them talk to the real built server over HTTP, on a throwaway database, so they test what a phone sees.
// Run: npm run build && npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { makeTicket, readWords, makeWords, leadingZeroBits } from '../src/lib/ticket.js';
import { WORDS } from '../src/lib/wordlist.js';
import { createCounter } from '../src/lib/server/counter.js';
import { cleanCity } from '../src/lib/area.js';

const KNOWN = new Set(WORDS);
const BUILT = existsSync(new URL('../build/index.js', import.meta.url));
const http = { skip: BUILT ? false : 'no build: run npm run build first' };

// ---- a real server on a throwaway database ----

const servers = [];
let port = 4400 + Math.floor(Math.random() * 400);

async function startServer(env = {}) {
	const dir = mkdtempSync(join(tmpdir(), 'counter-persona-'));
	const p = port++;
	const child = spawn(process.execPath, ['build'], {
		cwd: new URL('..', import.meta.url).pathname,
		env: {
			PATH: process.env.PATH,
			COUNTER_STAGE: 'staging',
			COUNTER_DB: join(dir, 'test.db'),
			COUNTER_BATCH_SECONDS: '0',
			COUNTER_PUZZLE_BITS: '8',
			HOST: '127.0.0.1',
			PORT: String(p),
			ORIGIN: `http://127.0.0.1:${p}`,
			...env
		},
		stdio: ['ignore', 'pipe', 'pipe']
	});
	let log = '';
	child.stdout.on('data', (d) => (log += d));
	child.stderr.on('data', (d) => (log += d));
	const base = `http://127.0.0.1:${p}`;
	for (let i = 0; i < 100; i++) {
		try {
			if ((await fetch(base + '/puzzle')).ok) break;
		} catch {}
		await new Promise((r) => setTimeout(r, 100));
	}
	const s = { base, dir, db: join(dir, 'test.db'), child, log: () => log };
	servers.push(s);
	return s;
}

after(() => {
	for (const s of servers) {
		s.child.kill();
		rmSync(s.dir, { recursive: true, force: true });
	}
});

async function solved(base) {
	const pz = await (await fetch(base + '/puzzle')).json();
	let answer = 0;
	while (leadingZeroBits(createHash('sha256').update(pz.salt + ':' + answer).digest()) < pz.bits) answer++;
	return { ...pz, answer };
}

async function press(base, slug, body, opts = {}) {
	const res = await fetch(`${base}/a/${slug}/join`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', origin: base },
		body: typeof body === 'string' ? body : JSON.stringify({ round: '', ...body, puzzle: 'puzzle' in opts ? opts.puzzle : await solved(base) })
	});
	let out = null;
	try {
		out = await res.json();
	} catch {}
	return { code: res.status, status: out?.status, out };
}

const words = () => makeWords(WORDS);

// ======================================================================
// 1. Not tech savvy: "I want to delete my Amazon and say I'm in"
// ======================================================================

let main;
before(async () => {
	if (BUILT) main = await startServer({ COUNTER_RATE_LIMIT: '1000' });
});

test('1 · she counts in with new words, and the page counts her once', http, async () => {
	const w = words();
	const t = await makeTicket(w, 'amazon-delete-2026');
	const first = await press(main.base, 'amazon-delete-2026', { ticket: t, country: 'DE', city: 'berlin ', postalCode: '10437', sums: { addresses: 2 } });
	assert.equal(first.status, 'counted');
	assert.ok(first.out.shownAt >= first.out.at - 1000, 'tells the page when the number includes her');
	const again = await press(main.base, 'amazon-delete-2026', { ticket: t });
	assert.equal(again.status, 'already');
	const page = await (await fetch(main.base + '/a/amazon-delete-2026')).text();
	assert.match(page, /I deleted my Amazon account/);
	assert.doesNotMatch(page, /\b1 people\b/, 'no "1 people"');
});

test('1 · she forgets her words on the device and types them back messily: same ticket, "already"', http, async () => {
	const w = ['paralegal', 'afterlife', 'obsession', 'could', 'bootlace', 'goofy'];
	const t1 = await makeTicket(w, 'amazon-cancel-prime');
	assert.equal((await press(main.base, 'amazon-cancel-prime', { ticket: t1 })).status, 'counted');
	for (const typed of ['Paralegal  afterlife, obsession\ncould bootlace Goofy ', 'PARALEGAL.AFTERLIFE.OBSESSION.COULD.BOOTLACE.GOOFY', '\tparalegal / afterlife · obsession ; could , bootlace   goofy\n\n']) {
		const back = readWords(typed, KNOWN);
		assert.deepEqual(back, w, typed);
		assert.equal((await press(main.base, 'amazon-cancel-prime', { ticket: await makeTicket(back, 'amazon-cancel-prime') })).status, 'already');
	}
});

test('1 · a typo or a missing word is caught before anything is sent', () => {
	assert.equal(readWords('paralegal afterlife obsession could bootlace goofey', KNOWN), null);
	assert.equal(readWords('paralegal afterlife obsession could bootlace', KNOWN), null);
	assert.equal(readWords('paralegal afterlife obsession could bootlace goofy goofy', KNOWN), null);
	assert.equal(readWords('', KNOWN), null);
});

test('1 · a city she types badly is dropped, and her count still goes in', http, async () => {
	const t = await makeTicket(words(), 'meta-delete-facebook');
	assert.equal((await press(main.base, 'meta-delete-facebook', { ticket: t, country: 'DE', city: 'Berlin 10437!!' })).status, 'counted');
});

test('1 · the strike: "I\'m in" before, "I did it" on the day (Sydney first, Hawaii last), closed after', () => {
	const c = createCounter(new DatabaseSync(':memory:'), { batchSeconds: 0, clock: false });
	const T = 'e'.repeat(64);
	const at = (iso) => ({ today: iso.slice(0, 10), now: new Date(iso) });
	assert.equal(c.join('attention-strike-2026', T, at('2026-11-20T10:00:00Z')), 'counted');
	assert.equal(c.numbers().counts['attention-strike-2026'].did, 0);
	// 10:30 on Fri Nov 27 in Sydney is still Thursday in Europe.
	assert.equal(c.join('attention-strike-2026', T, at('2026-11-26T23:30:00Z')), 'did_it');
	const late = 'f'.repeat(64);
	// Saturday morning in Honolulu: "I did it yesterday" still counts.
	assert.equal(c.join('attention-strike-2026', late, at('2026-11-28T20:00:00Z')), 'counted');
	assert.equal(c.numbers().counts['attention-strike-2026'].did, 2);
	assert.equal(c.join('attention-strike-2026', '1'.repeat(64), at('2026-11-29T13:00:00Z')), 'closed');
});

test('1 · Instagram-free Tuesday: every Tuesday is its own count, and the same words count again next week', async () => {
	const c = createCounter(new DatabaseSync(':memory:'), { batchSeconds: 0, clock: false });
	const w = words();
	const dec15 = await makeTicket(w, 'instagram-tuesdays', '2026-12-15');
	const dec22 = await makeTicket(w, 'instagram-tuesdays', '2026-12-22');
	assert.notEqual(dec15, dec22);
	assert.equal(c.join('instagram-tuesdays', dec15, { round: '2026-12-15', today: '2026-12-15', now: new Date('2026-12-15T12:00:00Z') }), 'counted');
	assert.equal(c.join('instagram-tuesdays', dec15, { round: '2026-12-15', today: '2026-12-15', now: new Date('2026-12-15T12:00:00Z') }), 'already');
	assert.equal(c.join('instagram-tuesdays', dec22, { round: '2026-12-22', today: '2026-12-22', now: new Date('2026-12-22T12:00:00Z') }), 'counted');
	// Last week's ticket can't be pressed into this week.
	assert.equal(c.join('instagram-tuesdays', dec15, { round: '2026-12-15', today: '2026-12-22', now: new Date('2026-12-22T12:00:00Z') }), 'closed');
	assert.deepEqual(c.numbers().rounds['instagram-tuesdays'], { '2026-12-15': { in: 1, did: 1 }, '2026-12-22': { in: 1, did: 1 } });
});

test('1 · "Forget me on this device" clears her words, her record and the pending note', async () => {
	const store = new Map();
	globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
	const d = await import('../src/lib/device.js');
	const w = words();
	d.saveWords(w);
	d.markMine('amazon-cancel-prime|', 'did');
	d.addPending('amazon-cancel-prime|', { in: 1, did: 1, until: Date.now() + 60_000 });
	assert.deepEqual(d.loadWords(), w);
	d.forgetMe();
	assert.equal(d.loadWords(), null);
	assert.deepEqual(d.loadMine(), {});
	assert.deepEqual(d.loadPending(), {});
	// A broken or tampered store is ignored, not trusted.
	store.set('counter.words', '["a","b"]');
	assert.equal(d.loadWords(), null);
	store.set('counter.words', '{not json');
	assert.equal(d.loadWords(), null);
	// The pending note goes once its time has passed.
	d.addPending('x|', { in: 1, did: 0, until: Date.now() - 120_000 });
	assert.deepEqual(d.loadPending(), {});
	// Private window: storage throws, nothing breaks.
	globalThis.localStorage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
	assert.equal(d.loadWords(), null);
	assert.equal(d.saveWords(w), false);
	d.forgetMe();
	delete globalThis.localStorage;
});

// ======================================================================
// 2. Privacy nerd: reads everything
// ======================================================================

test('2 · every page carries the locks: CSP, HSTS, no referrer, nosniff, no frames, and no cookie', http, async () => {
	for (const path of ['/', '/a/attention-strike-2026', '/privacy', '/calendar']) {
		const res = await fetch(main.base + path);
		assert.equal(res.status, 200, path);
		const h = res.headers;
		const csp = h.get('content-security-policy') ?? '';
		assert.match(csp, /default-src 'self'/, path);
		assert.match(csp, /connect-src 'self'/, path);
		assert.match(csp, /frame-ancestors 'none'/, path);
		assert.doesNotMatch(csp, /https?:\/\//, `${path}: no outside host allowed`);
		assert.match(h.get('strict-transport-security') ?? '', /max-age=/);
		assert.equal(h.get('referrer-policy'), 'no-referrer');
		assert.equal(h.get('x-content-type-options'), 'nosniff');
		assert.equal(h.get('x-frame-options'), 'DENY');
		assert.equal(h.get('set-cookie'), null, `${path}: no cookie`);
	}
});

test('2 · the page loads nothing from another host', http, async () => {
	for (const path of ['/', '/a/amazon-cancel-prime', '/privacy']) {
		const html = await (await fetch(main.base + path)).text();
		const outside = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
		// Plain links people click are fine; nothing may be loaded from elsewhere.
		const loaded = [...html.matchAll(/<(?:script|img|iframe|link)[^>]+(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => m[1]).filter((u) => !u.startsWith(main.base));
		assert.deepEqual(loaded, [], `${path} loads ${loaded.join(', ')} (links seen: ${outside.length})`);
	}
});

test('2 · the database file holds no IP address, no time of day, no city next to a ticket', http, async () => {
	const t = await makeTicket(words(), 'meta-less-personalised-ads');
	assert.equal((await press(main.base, 'meta-less-personalised-ads', { ticket: t, country: 'DE', city: 'Qqqdorf', postalCode: '99999' })).status, 'counted');
	const db = new DatabaseSync(main.db, { readOnly: true });
	const cols = db.prepare('PRAGMA table_info(entries)').all().map((r) => r.name).sort();
	assert.deepEqual(cols, ['action_slug', 'country', 'day', 'did_it', 'round', 'ticket']);
	const row = db.prepare('SELECT * FROM entries WHERE ticket = ?').get(t);
	assert.match(row.day, /^\d{4}-\d{2}-\d{2}$/, 'the day only');
	const place = db.prepare("SELECT * FROM places WHERE city = 'Qqqdorf'").get();
	assert.ok(place && !('ticket' in place) && !('day' in place));
	db.close();
	// Nothing in any file in the data folder mentions the address the request came from.
	for (const f of readdirSync(main.dir)) {
		const bytes = readFileSync(join(main.dir, f)).toString('latin1');
		assert.ok(!bytes.includes('127.0.0.1'), `${f} holds an IP address`);
	}
	// The only line the server ever prints is that it started.
	assert.deepEqual(main.log().trim().split('\n'), [`Listening on ${main.base}`], 'the server logs no requests');
});

test('2 · one person\'s tickets for different actions share nothing a database thief could match', async () => {
	const w = words();
	const slugs = ['attention-strike-2026', 'amazon-cancel-prime', 'amazon-delete-2026', 'meta-delete-facebook'];
	const ts = await Promise.all(slugs.map((s) => makeTicket(w, s)));
	assert.equal(new Set(ts).size, ts.length);
	// No shared prefix or suffix longer than chance.
	for (let i = 0; i < ts.length; i++)
		for (let j = i + 1; j < ts.length; j++) {
			let k = 0;
			while (ts[i][k] === ts[j][k]) k++;
			assert.ok(k < 6, 'shared prefix');
		}
});

test('2 · rows sit in ticket order, not in the order people came', () => {
	const db = new DatabaseSync(':memory:');
	const c = createCounter(db, { batchSeconds: 0, clock: false });
	for (const t of ['f'.repeat(64), '0'.repeat(64), '8'.repeat(64)]) c.join('amazon-cancel-prime', t, { today: '2026-11-20' });
	const order = db.prepare('SELECT ticket FROM entries').all().map((r) => r.ticket[0]);
	assert.deepEqual(order, ['0', '8', 'f']);
});

test('2 · areas under 10 are never shown, and the server only ever answers in a few fixed words', http, async () => {
	const page = await (await fetch(main.base + '/a/meta-less-personalised-ads')).text();
	assert.doesNotMatch(page, /Qqqdorf/);
	assert.doesNotMatch(page, /99999/);
	const statuses = new Set(['counted', 'did_it', 'already', 'closed', 'unknown', 'bad_ticket', 'bad_puzzle', 'slow_down', 'paused', 'bad_request']);
	const r = await press(main.base, 'amazon-cancel-prime', { ticket: 'a'.repeat(64) });
	assert.ok(statuses.has(r.status));
	assert.deepEqual(Object.keys(r.out).sort(), ['at', 'shownAt', 'status']);
});

test('2 · the privacy page says what is kept, in the words of the Nov 24 change', http, async () => {
	const page = await (await fetch(main.base + '/privacy')).text();
	assert.match(page, /not<\/b> kept next to your ticket/);
	assert.match(page, /proof that you took part/);
	assert.doesNotMatch(page, /They are kept next to the ticket/);
});

// ======================================================================
// 3. The hater: wants to mess it up
// ======================================================================

test('3 · junk in, nothing stored: bad JSON, bad tickets, unknown actions, wrong rounds', http, async () => {
	assert.equal((await press(main.base, 'amazon-cancel-prime', '{not json')).code, 400);
	for (const ticket of ['A'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), 'g'.repeat(64), 42, null, ['a'.repeat(64)], { x: 1 }])
		assert.equal((await press(main.base, 'amazon-cancel-prime', { ticket })).status, 'bad_ticket', JSON.stringify(ticket));
	assert.equal((await press(main.base, 'no-such-action', { ticket: 'b'.repeat(64) })).code, 404);
	assert.equal((await press(main.base, '..%2F..%2Fetc%2Fpasswd', { ticket: 'b'.repeat(64) })).code, 404);
	assert.equal((await press(main.base, 'instagram-tuesdays', { ticket: 'b'.repeat(64), round: '1999-01-05' })).status, 'closed');
});

test('3 · the puzzle can\'t be skipped, forged, reused, or kept past its time', http, async () => {
	const t = await makeTicket(words(), 'amazon-request-data');
	assert.equal((await press(main.base, 'amazon-request-data', { ticket: t }, { puzzle: null })).status, 'bad_puzzle');
	const p = await solved(main.base);
	assert.equal((await press(main.base, 'amazon-request-data', { ticket: t }, { puzzle: { ...p, signature: p.signature.toUpperCase() } })).status, 'bad_puzzle');
	assert.equal((await press(main.base, 'amazon-request-data', { ticket: t }, { puzzle: { ...p, signature: p.signature + '00' } })).status, 'bad_puzzle');
	assert.equal((await press(main.base, 'amazon-request-data', { ticket: t }, { puzzle: { ...p, salt: p.salt.replace(/\.\d+$/, '.99999999999999') } })).status, 'bad_puzzle');
	assert.equal((await press(main.base, 'amazon-request-data', { ticket: t }, { puzzle: { ...p, answer: p.answer + 0.5 } })).status, 'bad_puzzle');
	assert.equal((await press(main.base, 'amazon-request-data', { ticket: t }, { puzzle: p })).status, 'counted');
	assert.equal((await press(main.base, 'amazon-request-data', { ticket: 'c'.repeat(64) }, { puzzle: p })).status, 'bad_puzzle', 'a solved puzzle works once');
});

test('3 · inflating the sums: capped at 10, negatives and unknown names ignored, never twice', () => {
	const db = new DatabaseSync(':memory:');
	const c = createCounter(db, { batchSeconds: 0, clock: false });
	c.join('amazon-delete-2026', '1'.repeat(64), { today: '2026-11-20', sums: { addresses: 999999, payment_methods: -5, __proto__: { addresses: 5 }, constructor: 7, evil: 3 } });
	c.join('amazon-delete-2026', '1'.repeat(64), { today: '2026-11-20', sums: { addresses: 10 } });
	c.join('amazon-delete-2026', '2'.repeat(64), { today: '2026-11-20', sums: { addresses: '7; DROP TABLE entries' } });
	assert.deepEqual(c.numbers().totals['amazon-delete-2026'], { addresses: 10 });
	assert.equal(db.prepare('SELECT COUNT(*) AS n FROM entries').get().n, 2);
});

test('3 · words on the page: no city text can reach it, whatever is typed', () => {
	for (const evil of ['<script>alert(1)</script>', 'Youssef‮dusarF', 'Ber\u0000lin', 'x​y', '" onmouseover="x', 'Javascript:alert']) assert.equal(cleanCity(evil), null, evil);
	const c = createCounter(new DatabaseSync(':memory:'), { batchSeconds: 0, clock: false });
	for (let i = 0; i < 15; i++) c.join('amazon-cancel-prime', i.toString(16).padStart(64, '0'), { country: 'DE', city: 'Youssef Is A Fraud', today: '2026-11-18' });
	const shown = JSON.stringify(c.areas('2026-11-18'));
	assert.doesNotMatch(shown, /Fraud/);
});

test('3 · a flood from one address is slowed, then counting pauses by itself', http, async () => {
	const s = await startServer({ COUNTER_RATE_LIMIT: '3', COUNTER_PAUSE_PER_MINUTE: '1000' });
	const codes = [];
	for (let i = 0; i < 5; i++) codes.push((await press(s.base, 'amazon-cancel-prime', { ticket: (i + 1).toString(16).repeat(64) })).code);
	assert.deepEqual(codes, [200, 200, 200, 429, 429]);
	const f = await startServer({ COUNTER_RATE_LIMIT: '1000', COUNTER_PAUSE_PER_MINUTE: '2' });
	const st = [];
	for (let i = 0; i < 4; i++) st.push((await press(f.base, 'amazon-cancel-prime', { ticket: (i + 1).toString(16).repeat(64) })).status);
	assert.deepEqual(st, ['counted', 'counted', 'counted', 'paused']);
	// Reading still works while paused.
	assert.equal((await fetch(f.base + '/a/amazon-cancel-prime')).status, 200);
});

test('3 · the pause by hand: a PAUSE file stops counting within seconds, and lifting it resumes', http, async () => {
	const s = await startServer({ COUNTER_RATE_LIMIT: '1000' });
	writeFileSync(join(s.dir, 'PAUSE'), '');
	await new Promise((r) => setTimeout(r, 5200));
	assert.equal((await press(s.base, 'amazon-cancel-prime', { ticket: 'd'.repeat(64) })).status, 'paused');
	rmSync(join(s.dir, 'PAUSE'));
	await new Promise((r) => setTimeout(r, 5200));
	assert.equal((await press(s.base, 'amazon-cancel-prime', { ticket: 'd'.repeat(64) })).status, 'counted');
});

test('3 · a staging server refuses to open the live database', http, async () => {
	const dir = mkdtempSync(join(tmpdir(), 'counter-live-'));
	const db = new DatabaseSync(join(dir, 'live.db'));
	db.exec("CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL); INSERT INTO meta VALUES ('stage', 'live');");
	db.close();
	const s = await startServer({ COUNTER_DB: join(dir, 'live.db') });
	// Nothing is served from it: the server either never starts or answers every request with an error.
	let ok = false;
	try {
		ok = (await fetch(s.base + '/puzzle')).ok;
	} catch {}
	assert.equal(ok, false);
	assert.match(s.log(), /holds live data/);
	// And the live file is untouched: still no entries table.
	const after = new DatabaseSync(join(dir, 'live.db'), { readOnly: true });
	assert.equal(after.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'entries'").get().n, 0);
	after.close();
	rmSync(dir, { recursive: true, force: true });
});
