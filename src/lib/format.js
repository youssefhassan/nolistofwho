// Shared wording for dates and numbers.
export function niceDate(day) {
	return new Date(day + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
export function n(x) {
	return Number(x).toLocaleString('en-US');
}
/** "Friday", for a YYYY-MM-DD day. */
export function weekday(day) {
	return new Date(day + 'T12:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' });
}
