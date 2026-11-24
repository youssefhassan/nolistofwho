// Strict checks for the optional "Where". Used by the form (to explain) and by the server (to decide).
// A city is free text for now, but only letters, spaces, hyphens, apostrophes and full stops, 2 to 40
// characters. It is stored and not shown: only countries are shown until city names are reviewed.
import { COUNTRY_NAME } from './countries.js';

/** @returns {string|null} a country code from our own list, or null */
export function cleanCountry(c) {
	return typeof c === 'string' && Object.hasOwn(COUNTRY_NAME, c) ? c : null;
}

/** @returns {string|null} the city in tidy form ("Bad Homburg"), or null if it is not a plain place name */
export function cleanCity(c) {
	if (typeof c !== 'string' || c.length > 80) return null;
	const s = c.normalize('NFC').trim().replace(/ +/g, ' ');
	if (s.length < 2 || s.length > 40) return null;
	// Letters first and last; in between only letters, their marks, and . ' ’ - and single spaces.
	if (!/^\p{L}[\p{L}\p{M} .'’-]*[\p{L}\p{M}.]$/u.test(s)) return null;
	if (/[ .'’-]{2,}/.test(s.replace(/\. /g, '.'))) return null;
	const letters = (s.match(/\p{L}/gu) ?? []).length;
	const marks = (s.match(/\p{M}/gu) ?? []).length;
	if (letters < 2 || marks > letters) return null;
	return s.toLocaleLowerCase('en').replace(/(^|[\s-])\p{L}/gu, (m) => m.toLocaleUpperCase('en'));
}

/** @returns {string|null} the postal code in capitals, or null: 2 to 10 of A-Z, 0-9, space, hyphen */
export function cleanPostal(p) {
	if (typeof p !== 'string' || p.length > 20) return null;
	const s = p.trim().toUpperCase().replace(/ +/g, ' ');
	return /^[A-Z0-9](?:[ -]?[A-Z0-9]){1,9}$/.test(s) && s.length <= 10 ? s : null;
}
