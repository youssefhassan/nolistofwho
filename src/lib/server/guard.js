// Two guards against floods of fake tickets. Both live in memory only and are never written down or logged.
//
// 1. The puzzle (proof of work, like ALTCHA): the server hands out a signed puzzle; the browser spends about a
//    second solving it; a puzzle works once and for ten minutes. A bot has to pay that second for every ticket.
// 2. The rate limit: the IP address is scrambled with a random key that is replaced every ten minutes,
//    and only a count is kept next to it. When the key is replaced, all counts are thrown away.
import { createHmac, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { leadingZeroBits } from '../ticket.js';

const TEN_MINUTES = 10 * 60 * 1000;
const MAX_NETWORKS = 100_000;

/**
 * What the rate limit counts. An IPv4 address counts as itself. An IPv6 address counts as its /64 network,
 * because one home or one server usually holds a whole /64, which is 2^64 addresses.
 * @param {unknown} ip
 */
export function network(ip) {
	let s = String(ip).toLowerCase().split('%')[0];
	const v4 = s.match(/^(?:::ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
	if (v4) return v4[1];
	if (!s.includes(':')) return s;
	const [head, tail] = s.split('::');
	const h = head ? head.split(':') : [];
	const t = tail ? tail.split(':') : [];
	const groups = s.includes('::') ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill('0'), ...t] : h;
	return groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, '')).join(':') + '::/64';
}

export function createGuard({ bits = 16, limit = 20, now = () => Date.now() } = {}) {
	const secret = randomBytes(32); // signs puzzles; a new one at every restart
	let key = randomBytes(32);
	let keyBorn = now();
	let counts = new Map();
	const spent = new Map(); // puzzle salt -> expiry, so a solved puzzle works once

	function rotate() {
		if (now() - keyBorn >= TEN_MINUTES) {
			key = randomBytes(32);
			keyBorn = now();
			counts = new Map();
		}
		for (const [salt, exp] of spent) if (exp < now()) spent.delete(salt);
	}

	function sign(text) {
		return createHmac('sha256', secret).update(text).digest('hex');
	}

	/** A new puzzle. Holds nothing about who asked. */
	function puzzle() {
		const expires = now() + TEN_MINUTES;
		const salt = `${randomBytes(12).toString('hex')}.${expires}`;
		return { salt, bits, signature: sign(salt) };
	}

	/** @returns {boolean} */
	function checkPuzzle(p) {
		rotate();
		if (!p || typeof p.salt !== 'string' || typeof p.signature !== 'string' || !Number.isInteger(p.answer)) return false;
		if (!/^[0-9a-f]{64}$/.test(p.signature) || p.salt.length > 80) return false;
		const good = Buffer.from(sign(p.salt), 'hex');
		const given = Buffer.from(p.signature, 'hex');
		if (good.length !== given.length || !timingSafeEqual(good, given)) return false;
		const expires = Number(p.salt.split('.')[1]);
		if (!(expires > now())) return false;
		if (spent.has(p.salt)) return false;
		const digest = createHash('sha256').update(p.salt + ':' + p.answer).digest();
		if (leadingZeroBits(digest) < bits) return false;
		spent.set(p.salt, expires);
		return true;
	}

	/** @returns {boolean} true while this address has sent fewer than `limit` tickets in this ten-minute window */
	function allow(ip) {
		rotate();
		const k = createHmac('sha256', key).update(network(ip)).digest('hex');
		// A full table means a flood from very many networks: new ones wait for the next window.
		if (!counts.has(k) && counts.size >= MAX_NETWORKS) return false;
		const n = (counts.get(k) ?? 0) + 1;
		counts.set(k, n);
		return n <= limit;
	}

	return { puzzle, checkPuzzle, allow };
}
