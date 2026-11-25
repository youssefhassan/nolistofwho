// The person's six words, shared by every page while this tab is open.
// They live in this page's memory. They are written to the device only if the person ticks "remember".
// Nothing here is ever sent.
import { loadWords, saveWords, forgetMe } from './device.js';

export const key = $state({ words: null, remembered: false, ready: false });

/** Read remembered words from the device, once, in the browser. */
export function initKey() {
	if (key.ready) return;
	const w = loadWords();
	if (w) {
		key.words = w;
		key.remembered = true;
	}
	key.ready = true;
}

/** Use these words from now on; keep them on the device only when asked. */
export function setKey(words, remember) {
	key.words = words;
	key.remembered = remember ? saveWords(words) : false;
}

/** Drop the words from this tab, and the words and the record from the device. */
export function clearKey() {
	forgetMe();
	key.words = null;
	key.remembered = false;
}
