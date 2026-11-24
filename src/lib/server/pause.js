// The pause switch. While it is on, nobody can be counted; everything can still be read.
// Two ways it goes on:
//   by hand: a file named PAUSE next to the database (scripts/pause.sh on the server makes and removes it);
//   by itself: more new tickets in one minute than a real crowd would send, then it stays on for a while.
// Youssef is offline on strike day (Nov 27, 2026), so the second one is the guard when nobody is watching.
// Nothing about who sent what is kept: only a count per minute, in memory.
import { existsSync } from 'node:fs';

/**
 * @param {{ file?: string | null, perMinute?: number, holdMinutes?: number, now?: () => number, exists?: (f: string) => boolean }} [opts]
 */
export function createPause({ file = null, perMinute = 300, holdMinutes = 15, now = () => Date.now(), exists = existsSync } = {}) {
	let minute = 0;
	let count = 0;
	let until = 0;
	let fileSeen = false;
	let fileChecked = -Infinity;

	/** The file is looked at no more than every five seconds. */
	function byHand() {
		if (!file) return false;
		if (now() - fileChecked >= 5000) {
			fileSeen = exists(file);
			fileChecked = now();
		}
		return fileSeen;
	}

	/** @returns {false | 'hand' | 'flood'} */
	function paused() {
		if (byHand()) return 'hand';
		return now() < until ? 'flood' : false;
	}

	/** Call once for every new ticket that was counted. */
	function counted() {
		const m = Math.floor(now() / 60_000);
		if (m !== minute) {
			minute = m;
			count = 0;
		}
		count += 1;
		if (perMinute > 0 && count > perMinute) until = now() + holdMinutes * 60_000;
	}

	return { paused, counted, until: () => until };
}
