// What stays on the person's own device, in this browser only, and is never sent anywhere:
// their six words (if they want), their own record of what they counted, and for a few minutes a note
// that adds their own count to the number on their screen before the public number includes it.
// Every read and write is wrapped: private windows and blocked storage simply mean nothing is remembered.

const WORDS_KEY = 'counter.words';
const MINE_KEY = 'counter.mine';
const PENDING_KEY = 'counter.pending';

function read(key) {
	try {
		return JSON.parse(localStorage.getItem(key) ?? 'null');
	} catch {
		return null;
	}
}

function write(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch {
		return false;
	}
}

/** @returns {string[] | null} */
export function loadWords() {
	const w = read(WORDS_KEY);
	return Array.isArray(w) && w.length === 6 && w.every((x) => typeof x === 'string') ? w : null;
}

export function saveWords(words) {
	return write(WORDS_KEY, words);
}

/** @returns {Record<string, 'in' | 'did'>} keyed "action|round" */
export function loadMine() {
	const m = read(MINE_KEY);
	return m && typeof m === 'object' ? m : {};
}

export function markMine(key, value) {
	const m = loadMine();
	if (m[key] !== 'did') m[key] = value;
	write(MINE_KEY, m);
	return m;
}

/**
 * Counts that the public number doesn't show yet: your own screen adds them until the next batch.
 * Each note says what to add and until when, and is dropped once that time has passed.
 * @returns {Record<string, { in: number, did: number, until: number }>} keyed "action|round"
 */
export function loadPending(nowMs = Date.now()) {
	const p = read(PENDING_KEY);
	if (!p || typeof p !== 'object') return {};
	const live = Object.fromEntries(Object.entries(p).filter(([, v]) => v && typeof v.until === 'number' && v.until > nowMs - 60_000));
	if (Object.keys(live).length !== Object.keys(p).length) write(PENDING_KEY, live);
	return live;
}

export function addPending(key, bump) {
	const p = loadPending();
	p[key] = bump;
	write(PENDING_KEY, p);
	return p;
}

export function forgetMe() {
	try {
		localStorage.removeItem(WORDS_KEY);
		localStorage.removeItem(MINE_KEY);
		localStorage.removeItem(PENDING_KEY);
	} catch {}
}
