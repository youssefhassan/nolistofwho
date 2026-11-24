// The entry ticket. This file runs in the person's browser.
// Six random words are made on the device and kept by the person (paper, or a photo).
// For each action, the words are hashed with the action's name. Only that hash, the ticket, is ever sent.
import { argon2id } from 'hash-wasm';

/** Public, the same for everyone, baked into the page. Changing it would make every person new again. */
export const SITE_SALT = 'nolistofwho.org:counter:v1';

/** Cost of one ticket. Aim: 1 to 2 seconds on a mid-range phone. To be tuned on real phones before Nov 22. */
export const COST = { iterations: 3, memorySize: 32 * 1024, parallelism: 1, hashLength: 32 };

export const WORD_COUNT = 6;

/** Pick an index in [0, n) with no bias, from the browser's own random generator. */
function randomIndex(n, rand = crypto.getRandomValues.bind(crypto)) {
	const limit = Math.floor(0x100000000 / n) * n;
	const buf = new Uint32Array(1);
	for (;;) {
		rand(buf);
		if (buf[0] < limit) return buf[0] % n;
	}
}

/** @param {string[]} list the word list */
export function makeWords(list, count = WORD_COUNT) {
	return Array.from({ length: count }, () => list[randomIndex(list.length)]);
}

/**
 * Read words back the way a person types them: any case, any spaces, commas, dots or new lines between them.
 * Returns the words, or null when they are not exactly six words from the list.
 * @param {string} text
 * @param {Set<string>} known
 */
export function readWords(text, known) {
	const words = String(text).toLowerCase().split(/[\s,.;·/]+/).filter(Boolean);
	if (words.length !== WORD_COUNT) return null;
	return words.every((w) => known.has(w)) ? words : null;
}

/**
 * What gets hashed. The action's name is inside, so tickets for two actions cannot be linked.
 * For a repeating action the round's start day is inside too, so one person's rounds cannot be linked either:
 * the same six words make a new ticket every round, and the ticket ends with its round.
 */
export function ticketInput(words, actionSlug, round = '') {
	return words.join(' ') + '\u0000' + String(actionSlug) + (round ? '\u0000' + String(round) : '');
}

/** @returns {Promise<string>} 64 hex characters */
export async function makeTicket(words, actionSlug, round = '') {
	return argon2id({
		password: ticketInput(words, actionSlug, round),
		salt: new TextEncoder().encode(SITE_SALT),
		...COST,
		outputType: 'hex'
	});
}

/**
 * The anti-bot work: find a number that, hashed with the server's puzzle, starts with enough zero bits.
 * About a second of work for a phone, and the server checks it in a moment. No third party, no tracking.
 * @param {{ salt: string, bits: number }} puzzle
 */
export async function solvePuzzle(puzzle) {
	const enc = new TextEncoder();
	for (let n = 0; ; n++) {
		const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(puzzle.salt + ':' + n)));
		if (leadingZeroBits(digest) >= puzzle.bits) return n;
	}
}

export function leadingZeroBits(bytes) {
	let bits = 0;
	for (const b of bytes) {
		if (b === 0) {
			bits += 8;
			continue;
		}
		return bits + Math.clz32(b) - 24;
	}
	return bits;
}
