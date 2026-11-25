// The counter's whole memory. Read SPEC.md first.
// What is kept per entry: the ticket, the country if given, the day. Nothing else. No time of day, no IP address.
// City and postal code (optional) are kept apart, in `places`, as counts with no ticket and no day next to them
// (Youssef, Nov 24: "optional, not necessarily related to a ticket").

import { cleanCountry, cleanCity, cleanPostal } from '../area.js';

/** A ticket is 32 bytes of Argon2id output, as 64 hex characters. Anything else is refused. */
export const TICKET_RE = /^[0-9a-f]{64}$/;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS actions (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  ask TEXT NOT NULL,
  company TEXT NOT NULL,          -- 'bigtech', 'amazon', 'x', 'meta', 'google'
  kind TEXT NOT NULL,             -- 'day' (has a date) or 'step' (any day)
  called_by TEXT,                 -- another group's name, or NULL when it is ours
  called_by_url TEXT,
  date TEXT,                      -- YYYY-MM-DD for a day, NULL for a step
  next TEXT,                      -- slug of the action this one hands over to
  sort INTEGER NOT NULL DEFAULT 0,
  repeat TEXT,                    -- NULL (once) or 'weekly'
  until TEXT,                     -- weekly: the last round starts on or before this day; NULL: no end yet
  days INTEGER NOT NULL DEFAULT 1 -- how long one round lasts: 1 for a day, 31 for a month
);
-- WITHOUT ROWID: rows sit in ticket order, so the file does not record who came first.
-- round: '' for an action that happens once, or the start day of one round of a repeating action.
-- A ticket belongs to one round only, so the rounds of one person cannot be linked.
CREATE TABLE IF NOT EXISTS entries (
  action_slug TEXT NOT NULL,
  round TEXT NOT NULL DEFAULT '',
  ticket TEXT NOT NULL,
  country TEXT,
  day TEXT NOT NULL,              -- rounded to the day, on purpose
  did_it INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (action_slug, round, ticket)
) WITHOUT ROWID;
-- Places, as counts only: no ticket, no day. Nobody can tell which entry gave which city or postal code.
CREATE TABLE IF NOT EXISTS places (
  action_slug TEXT NOT NULL,
  round TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (action_slug, round, country, city, postal_code)
) WITHOUT ROWID;
-- Sums, not lists: a person's numbers are added here and never kept next to the ticket.
CREATE TABLE IF NOT EXISTS totals (
  action_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  sum INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (action_slug, name)
);
CREATE TABLE IF NOT EXISTS removals (
  action_slug TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);
`;

/** The actions known today. New actions are new rows here; nothing else changes. */
export const SEED = [
	{ slug: 'attention-strike-2026', title: 'The Attention Strike', ask: 'Log off every big tech platform for 24 hours. Buy nothing.', company: 'bigtech', kind: 'day', called_by: 'Take Back Big Tech', called_by_url: 'https://takebackbigtech.com/attention-strike', date: '2026-11-27', next: 'x-sundays', sort: 10 },
	{ slug: 'amazon-cancel-prime', title: 'I cancelled Prime', ask: 'Cancel Amazon Prime. It is the first step out.', company: 'amazon', kind: 'step', next: 'amazon-request-data', sort: 30 },
	{ slug: 'amazon-request-data', title: 'I requested my data from Amazon', ask: 'Ask Amazon for everything it holds on you. Amazon may cover several stores in one request, so check what yours includes.', company: 'amazon', kind: 'step', next: 'amazon-delete-2026', sort: 40 },
	// Always open, like the other Amazon steps (Youssef, Nov 20, 2026: "the strike is just the strike... it should be there always").
	// The slug keeps its "2026" so the address stays the same.
	{ slug: 'amazon-delete-2026', title: 'I deleted my Amazon account', ask: 'Close your Amazon account for good. Request your data first.', company: 'amazon', kind: 'step', sort: 45 },
	{ slug: 'x-sundays', title: 'Sundays off X', ask: "Don't open X on Sunday. From Jan 3, bring one person.", company: 'x', kind: 'day', repeat: 'weekly', date: '2026-11-22', until: '2027-01-17', next: 'x-weekday', sort: 50 },
	{ slug: 'x-weekday', title: 'One working day off X', ask: "One day, not every week. Don't open X on a working day, when the ads run. Request your X archive the same day.", company: 'x', kind: 'day', date: '2027-01-13', next: 'x-leave', sort: 70 },
	{ slug: 'x-leave', title: 'Leave X together', ask: 'Post your new handle, then deactivate.', company: 'x', kind: 'day', date: '2027-01-20', sort: 80 },
	{ slug: 'instagram-tuesdays', title: 'Instagram-free Tuesdays', ask: "Don't open Instagram on Tuesday.", company: 'meta', kind: 'day', repeat: 'weekly', date: '2026-11-24', sort: 85 },
	{ slug: 'meta-delete-facebook', title: 'I deleted Facebook', ask: 'Download your data first, fix the apps you log into with Facebook, hand over your pages, then delete.', company: 'meta', kind: 'step', next: 'meta-less-personalised-ads', sort: 90 },
	{ slug: 'meta-less-personalised-ads', title: 'I switched to less personalised ads', ask: 'In the EU, Meta must offer ads that use less of your data. Switch it on.', company: 'meta', kind: 'step', sort: 100 }
];

/** Actions that were replaced. Their rows go; entries stay in the file but are no longer shown. */
export const RETIRED = ['x-sunday-1', 'x-sunday-2'];

export const COMPANIES = [
	{ id: 'bigtech', name: 'All of big tech' },
	{ id: 'amazon', name: 'Amazon' },
	{ id: 'x', name: 'X' },
	{ id: 'meta', name: 'Meta' },
	{ id: 'google', name: 'Google' }
];

/** YYYY-MM-DD, in UTC. The only clock reading that is ever stored. */
export function dayOf(now = new Date()) {
	return now.toISOString().slice(0, 10);
}

function addDays(day, n) {
	const d = new Date(day + 'T00:00:00Z');
	d.setUTCDate(d.getUTCDate() + n);
	return dayOf(d);
}

const HOUR = 3600 * 1000;

/**
 * A day, Anywhere on Earth (AoE): it starts when the date begins in the first place on Earth (UTC+14, Kiribati)
 * and ends when it ends in the last place (UTC-12). That is how strikes work in practice: your own Friday,
 * wherever you live. The window is 50 hours long.
 * @param {string} date YYYY-MM-DD
 */
export function aoe(date) {
	const midnight = Date.parse(date + 'T00:00:00Z');
	return { opens: midnight - 14 * HOUR, closes: midnight + 36 * HOUR };
}

/** A day string means noon UTC that day (for tests and the staging pretend date); a Date is used as it is. */
function instant(now) {
	return typeof now === 'string' ? Date.parse(now + 'T12:00:00Z') : now.getTime();
}

/** The days of one round. */
function round(start, days) {
	return { key: '', start, end: addDays(start, (days ?? 1) - 1) };
}

/**
 * The round that is open now, or the next one; null when the action is over.
 * An action that happens once has one round, with the key ''. A weekly action has a round every 7 days,
 * keyed by its start day; only one round is open at a time, so "I'm in" is always for the next one.
 * @param {Date | string} now
 */
export function currentRound(action, now = new Date()) {
	if (action.kind === 'step') return null;
	const t = instant(now);
	if (action.repeat !== 'weekly') {
		const r = round(action.date, action.days);
		return t < aoe(addDays(r.end, 1)).closes ? r : null;
	}
	const first = Date.parse(action.date + 'T00:00:00Z');
	// Jump close to now, then step: the round stays open until the day after its end has ended everywhere.
	let k = Math.max(0, Math.floor((t - first) / (7 * 24 * HOUR)) - 1);
	for (;;) {
		const start = addDays(action.date, 7 * k);
		if (action.until && start > action.until) return null;
		const r = { ...round(start, action.days), key: start };
		if (t < aoe(addDays(r.end, 1)).closes) return r;
		k++;
	}
}

/** Closed rounds of a weekly action, newest first. */
export function pastRounds(action, now = new Date(), max = 52) {
	if (action.repeat !== 'weekly') return [];
	const cur = currentRound(action, now);
	const out = [];
	for (let k = 0; out.length < 10000; k++) {
		const start = addDays(action.date, 7 * k);
		if ((cur && start >= cur.start) || (action.until && start > action.until)) break;
		if (!cur && instant(now) < aoe(start).opens) break;
		out.push(start);
	}
	return out.reverse().slice(0, max);
}

/**
 * upcoming: before the round; the verb is "I'm in".
 * running: a round of several days has begun; still "I'm in".
 * today: from the moment the last day begins anywhere on Earth until the day after has ended everywhere
 *   ("I did it yesterday"); the verb is "I did it".
 * past: closed, shown as a result.
 */
export function roundState(r, now = new Date()) {
	const t = instant(now);
	if (t < aoe(r.start).opens) return 'upcoming';
	if (t < aoe(r.end).opens) return 'running';
	if (t < aoe(addDays(r.end, 1)).closes) return 'today';
	return 'past';
}

/**
 * The state of an action now. A step has no date and is always open.
 * @param {Date | string} now
 */
export function stateOf(action, now = new Date()) {
	if (action.kind === 'step') return 'open';
	const r = currentRound(action, now);
	return r ? roundState(r, now) : 'past';
}

/**
 * @param {import('node:sqlite').DatabaseSync} db
 * @param {{ batchSeconds?: number, clock?: boolean }} [opts] the public numbers are refreshed at most this often,
 *   so nobody can match a jump in the number to a person. Default: five minutes.
 */
export function createCounter(db, opts = {}) {
	const batchMs = (opts.batchSeconds ?? 300) * 1000;
	migrate(db);
	db.exec(SCHEMA);

	const upsert = db.prepare(`INSERT INTO actions (slug, title, ask, company, kind, called_by, called_by_url, date, next, sort, repeat, until, days)
		VALUES (:slug, :title, :ask, :company, :kind, :called_by, :called_by_url, :date, :next, :sort, :repeat, :until, :days)
		ON CONFLICT(slug) DO UPDATE SET title=excluded.title, ask=excluded.ask, company=excluded.company, kind=excluded.kind,
		called_by=excluded.called_by, called_by_url=excluded.called_by_url, date=excluded.date, next=excluded.next, sort=excluded.sort,
		repeat=excluded.repeat, until=excluded.until, days=excluded.days`);
	for (const a of SEED) {
		upsert.run({ slug: a.slug, title: a.title, ask: a.ask, company: a.company, kind: a.kind, called_by: a.called_by ?? null, called_by_url: a.called_by_url ?? null, date: a.date ?? null, next: a.next ?? null, sort: a.sort, repeat: a.repeat ?? null, until: a.until ?? null, days: a.days ?? 1 });
	}
	const retire = db.prepare('DELETE FROM actions WHERE slug = ?');
	for (const slug of RETIRED) retire.run(slug);

	const q = {
		action: db.prepare('SELECT * FROM actions WHERE slug = ?'),
		actions: db.prepare('SELECT * FROM actions ORDER BY sort'),
		entry: db.prepare('SELECT did_it FROM entries WHERE action_slug = ? AND round = ? AND ticket = ?'),
		insert: db.prepare('INSERT INTO entries (action_slug, round, ticket, country, day, did_it) VALUES (?, ?, ?, ?, ?, ?)'),
		addPlace: db.prepare('INSERT INTO places (action_slug, round, country, city, postal_code, n) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT DO UPDATE SET n = n + 1'),
		areas: db.prepare('SELECT action_slug, round, country, COUNT(*) AS n FROM entries GROUP BY action_slug, round, country'),
		addRemoval: db.prepare('INSERT INTO removals (action_slug, count) VALUES (?, ?) ON CONFLICT(action_slug) DO UPDATE SET count = count + excluded.count'),
		markDid: db.prepare('UPDATE entries SET did_it = 1 WHERE action_slug = ? AND round = ? AND ticket = ?'),
		counts: db.prepare('SELECT action_slug, round, COUNT(*) AS n, SUM(did_it) AS did FROM entries GROUP BY action_slug, round'),
		addTotal: db.prepare('INSERT INTO totals (action_slug, name, sum) VALUES (?, ?, ?) ON CONFLICT(action_slug, name) DO UPDATE SET sum = sum + excluded.sum'),
		totals: db.prepare('SELECT action_slug, name, sum FROM totals'),
		removals: db.prepare('SELECT action_slug, count FROM removals'),
		removalGen: db.prepare('SELECT COALESCE(SUM(count), 0) AS n FROM removals')
	};

	let snapshot = null;
	let snapshotAt = 0;
	let snapshotTaken = 0; // the real moment the snapshot was read from the table

	function takeSnapshot() {
		const counts = {}; // actions that happen once, and steps: counts[slug]
		const rounds = {}; // repeating actions: rounds[slug][round start day]
		for (const r of q.counts.all()) {
			const c = { in: Number(r.n), did: Number(r.did ?? 0) };
			if (r.round) (rounds[r.action_slug] ??= {})[r.round] = c;
			else counts[r.action_slug] = c;
		}
		const totals = {};
		for (const r of q.totals.all()) (totals[r.action_slug] ??= {})[r.name] = Number(r.sum);
		const removed = {};
		for (const r of q.removals.all()) removed[r.action_slug] = Number(r.count);
		return { counts, rounds, totals, removed };
	}

	/**
	 * The public numbers, as of the last batch. Batches follow the clock (every five minutes: 21:00, 21:05, …),
	 * so everyone who counts in between two updates shows up together, and a page can say when the next one is.
	 */
	function numbers(nowMs = Date.now()) {
		const epoch = batchMs ? Math.floor(nowMs / batchMs) : nowMs;
		if (!snapshot || batchMs === 0 || epoch !== snapshotAt) {
			snapshot = takeSnapshot();
			snapshotAt = epoch;
			snapshotTaken = nowMs;
		}
		return snapshot;
	}

	/**
	 * The real moment the numbers now on show were read. Usually the last five-minute mark, but after a restart
	 * it is the restart: then the numbers already hold everyone who counted before it. A page uses this to know
	 * whether a person's own fresh count is already inside the public number (else it showed them twice).
	 */
	function takenAt(nowMs = Date.now()) {
		numbers(nowMs);
		return snapshotTaken;
	}

	/** When the public numbers next move (ms since 1970). Someone who counts in now shows up then. */
	function nextUpdate(nowMs = Date.now()) {
		return batchMs ? (Math.floor(nowMs / batchMs) + 1) * batchMs : nowMs;
	}

	// Take each batch right on the clock, so it holds only what came before that moment.
	if (batchMs > 0 && opts.clock !== false) {
		const tick = () => {
			numbers();
			setTimeout(tick, nextUpdate() - Date.now() + 1).unref?.();
		};
		setTimeout(tick, nextUpdate() - Date.now() + 1).unref?.();
	}

	/** The numbers of one round: the current one, or a past one. */
	function countOf(slug, roundKey = '', nowMs) {
		const n = numbers(nowMs);
		return (roundKey ? n.rounds[slug]?.[roundKey] : n.counts[slug]) ?? { in: 0, did: 0 };
	}

	function getAction(slug) {
		return q.action.get(slug) ?? null;
	}

	function listActions() {
		return q.actions.all();
	}

	/**
	 * Count a ticket once per round.
	 * Returns 'counted' (new), 'did_it' (was in, now also did it), 'already' (nothing changed),
	 * 'closed' (the action is past, or the round asked for is not the open one), 'unknown' (no such action)
	 * or 'bad_ticket'. The answer never says more than that.
	 *
	 * @param {string} slug
	 * @param {string} ticket
	 * @param {{ round?: string, country?: string, city?: string, postalCode?: string, sums?: Record<string, number>, today?: string, now?: Date }} [extra]
	 *   round: the round the ticket was made for ('' for an action that happens once);
	 *   today: the day stored with the entry (UTC); now: the moment used for the state (defaults to noon of `today`)
	 */
	function join(slug, ticket, extra = {}) {
		if (typeof ticket !== 'string' || !TICKET_RE.test(ticket)) return 'bad_ticket';
		const action = getAction(slug);
		if (!action) return 'unknown';
		const today = extra.today ?? dayOf();
		const now = extra.now ?? today;
		let roundKey = '';
		let state = 'open';
		if (action.kind !== 'step') {
			const r = currentRound(action, now);
			if (!r) return 'closed';
			if ((extra.round ?? '') !== r.key) return 'closed'; // a ticket made for another round
			roundKey = r.key;
			state = roundState(r, now);
			if (state === 'past') return 'closed';
		}
		// On the last day of a round, and for a step, pressing the button means "I did it".
		const did = state === 'today' || state === 'open' ? 1 : 0;

		const existing = q.entry.get(slug, roundKey, ticket);
		if (existing) {
			if (did && !existing.did_it) {
				q.markDid.run(slug, roundKey, ticket);
				return 'did_it';
			}
			return 'already';
		}
		const country = cleanCountry(extra.country);
		q.insert.run(slug, roundKey, ticket, country, today, did);
		// City and postal code go into a separate count, never next to the ticket.
		const city = country ? cleanCity(extra.city) : null;
		const postal = country ? cleanPostal(extra.postalCode) : null;
		if (city || postal) q.addPlace.run(slug, roundKey, country, city ?? '', postal ?? '');
		// Sums are added on the first join only, capped, and never stored with the ticket.
		for (const [name, value] of Object.entries(extra.sums ?? {})) {
			if (!SUM_NAMES.includes(name)) continue;
			const n = Math.max(0, Math.min(SUM_CAP, Math.floor(Number(value) || 0)));
			if (n > 0) q.addTotal.run(slug, name, n);
		}
		return 'counted';
	}

	let areaSnapshot = null;
	let areaDay = null;
	let areaGen = -1;

	/**
	 * Areas, once a day, with the 10-or-more rule applied (see rollUp).
	 * Keyed by slug for an action that happens once, and by `slug@round` for one round of a repeating action.
	 */
	function areas(today = dayOf()) {
		// A removal made by scripts/remove.js runs in another process, so the snapshot also watches the removal total.
		const gen = Number(q.removalGen.get().n);
		if (!areaSnapshot || areaDay !== today || areaGen !== gen || batchMs === 0) {
			const by = {};
			// Only countries are shown for now (Youssef, Nov 18): a city is free text, and ten fake tickets could
			// put any words on the page. Cities are counted apart, in `places`, and not shown.
			for (const r of q.areas.all()) (by[r.round ? `${r.action_slug}@${r.round}` : r.action_slug] ??= []).push({ country: cleanCountry(r.country), city: null, n: Number(r.n) });
			areaSnapshot = Object.fromEntries(Object.entries(by).map(([k, rows]) => [k, rollUp(rows)]));
			areaDay = today;
			areaGen = gen;
		}
		return areaSnapshot;
	}

	/**
	 * Remove entries that are clearly abuse, by day and, if given, country.
	 * Returns how many were removed; the public removal count goes up by that much.
	 * Places are not touched: they have no day, so they can't be matched to the removed entries.
	 */
	function remove(slug, { day, country } = {}) {
		let sql = 'DELETE FROM entries WHERE action_slug = ? AND day = ?';
		const args = [slug, day];
		if (country) { sql += ' AND country = ?'; args.push(country); }
		const n = Number(db.prepare(sql).run(...args).changes);
		if (n > 0) q.addRemoval.run(slug, n);
		snapshot = null;
		areaSnapshot = null;
		return n;
	}

	return { join, numbers, nextUpdate, takenAt, countOf, areas, remove, getAction, listActions };
}

/** Bring an older file up to date. Staging files from before Nov 17 have no city, no rounds, no repeat. */
function migrate(db) {
	const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
	const has = (t) => db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
	if (has('actions')) {
		const a = cols('actions');
		if (!a.includes('repeat')) db.exec('ALTER TABLE actions ADD COLUMN repeat TEXT');
		if (!a.includes('until')) db.exec('ALTER TABLE actions ADD COLUMN until TEXT');
		if (!a.includes('days')) db.exec('ALTER TABLE actions ADD COLUMN days INTEGER NOT NULL DEFAULT 1');
	}
	if (has('entries')) {
		const e = cols('entries');
		if (!e.includes('city')) db.exec('ALTER TABLE entries ADD COLUMN city TEXT');
		if (!e.includes('round')) {
			// The key changes, so the table is rebuilt. Everything before had no rounds: round ''.
			db.exec(`BEGIN;
				ALTER TABLE entries RENAME TO entries_old;
				CREATE TABLE entries (action_slug TEXT NOT NULL, round TEXT NOT NULL DEFAULT '', ticket TEXT NOT NULL, country TEXT, city TEXT,
				  postal_code TEXT, day TEXT NOT NULL, did_it INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (action_slug, round, ticket)) WITHOUT ROWID;
				INSERT INTO entries (action_slug, round, ticket, country, city, postal_code, day, did_it)
				  SELECT action_slug, '', ticket, country, city, postal_code, day, did_it FROM entries_old;
				DROP TABLE entries_old;
				COMMIT;`);
		}
		// Nov 24: city and postal code leave the entries. They move into `places` as counts, and the entries
		// are rebuilt without them. VACUUM then rewrites the file, so the old rows are not left in free space.
		const e2 = cols('entries');
		if (e2.includes('city') || e2.includes('postal_code')) {
			const city = e2.includes('city') ? 'city' : 'NULL';
			const postal = e2.includes('postal_code') ? 'postal_code' : 'NULL';
			db.exec(`BEGIN;
				CREATE TABLE IF NOT EXISTS places (action_slug TEXT NOT NULL, round TEXT NOT NULL DEFAULT '', country TEXT NOT NULL,
				  city TEXT NOT NULL DEFAULT '', postal_code TEXT NOT NULL DEFAULT '', n INTEGER NOT NULL DEFAULT 0,
				  PRIMARY KEY (action_slug, round, country, city, postal_code)) WITHOUT ROWID;
				INSERT INTO places (action_slug, round, country, city, postal_code, n)
				  SELECT action_slug, round, country, COALESCE(${city}, ''), COALESCE(${postal}, ''), COUNT(*) FROM entries
				  WHERE country IS NOT NULL AND (${city} IS NOT NULL OR ${postal} IS NOT NULL)
				  GROUP BY action_slug, round, country, COALESCE(${city}, ''), COALESCE(${postal}, '')
				  ON CONFLICT DO UPDATE SET n = n + excluded.n;
				ALTER TABLE entries RENAME TO entries_old;
				CREATE TABLE entries (action_slug TEXT NOT NULL, round TEXT NOT NULL DEFAULT '', ticket TEXT NOT NULL, country TEXT,
				  day TEXT NOT NULL, did_it INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (action_slug, round, ticket)) WITHOUT ROWID;
				INSERT INTO entries (action_slug, round, ticket, country, day, did_it)
				  SELECT action_slug, round, ticket, country, day, did_it FROM entries_old;
				DROP TABLE entries_old;
				COMMIT;`);
			db.exec('VACUUM');
		}
	}
}

export const SUM_NAMES = ['addresses', 'payment_methods'];
export const SUM_CAP = 10;

/**
 * The 10-or-more rule. An area is shown only when at least MIN people share it.
 * Smaller ones join "<country>, elsewhere", and small countries join "Elsewhere in the world".
 * The remainder rule: an "elsewhere" line is also kept at MIN or more, by folding the smallest shown
 * area back into it, so nobody can work out a small group by subtracting.
 * @param {{ country: string|null, city: string|null, n: number }[]} rows
 */
export function rollUp(rows, MIN = 10) {
	const countries = new Map();
	let notSaid = 0;
	for (const r of rows) {
		if (!r.country) { notSaid += r.n; continue; }
		const c = countries.get(r.country) ?? { total: 0, cities: new Map() };
		c.total += r.n;
		if (r.city) c.cities.set(r.city, (c.cities.get(r.city) ?? 0) + r.n);
		countries.set(r.country, c);
	}
	const out = [];
	let world = notSaid;
	const shownCountries = [];
	for (const [code, c] of countries) {
		if (c.total < MIN) { world += c.total; continue; }
		const shown = [...c.cities].filter(([, n]) => n >= MIN).sort((a, b) => b[1] - a[1]);
		let rest = c.total - shown.reduce((s, [, n]) => s + n, 0);
		while (rest > 0 && rest < MIN && shown.length) rest += shown.pop()[1];
		shownCountries.push({ code, total: c.total, shown, rest });
	}
	// The world remainder follows the same rule: fold the smallest country into it.
	shownCountries.sort((a, b) => b.total - a.total);
	while (world > 0 && world < MIN && shownCountries.length) world += shownCountries.pop().total;
	for (const c of shownCountries) {
		for (const [city, n] of c.shown) out.push({ country: c.code, city, n });
		if (c.rest > 0) out.push({ country: c.code, city: null, n: c.rest });
	}
	if (world > 0) out.push({ country: null, city: null, n: world });
	return out;
}
