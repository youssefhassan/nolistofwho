// The calendar feed: every dated action as an all-day event, so people get reminded without giving an email.
// A calendar app fetches this now and then. Nothing about who fetches it is kept.
// Format: iCalendar (RFC 5545). Lines end in CRLF and are folded at 75 bytes.

const enc = new TextEncoder();

/** Escape text for an iCalendar value. */
export function icsText(s) {
	return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

/** Fold a line at 75 bytes, never inside a character. */
export function fold(line) {
	const out = [];
	let cur = '';
	let bytes = 0;
	for (const ch of line) {
		const b = enc.encode(ch).length;
		const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
		if (bytes + b > limit) {
			out.push(cur);
			cur = '';
			bytes = 0;
		}
		cur += ch;
		bytes += b;
	}
	out.push(cur);
	return out.join('\r\n ');
}

const compact = (day) => day.replaceAll('-', '');

function addDays(day, n) {
	const d = new Date(day + 'T00:00:00Z');
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

/**
 * @param {{ slug: string, title: string, ask: string, kind: string, date: string|null, called_by?: string|null, repeat?: string|null, until?: string|null, days?: number }[]} actions
 * @param {{ origin: string, staging?: boolean, stamp?: Date }} opts
 */
export function calendar(actions, { origin, staging = false, stamp = new Date() }) {
	const dtstamp = stamp.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
	const name = staging ? 'No list of who (staging: test build)' : 'No list of who';
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//nolistofwho.org//The Counter//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`X-WR-CALNAME:${icsText(name)}`,
		`X-WR-CALDESC:${icsText('Direct actions against big tech, counted with no list of who.')}`,
		'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
		'X-PUBLISHED-TTL:PT12H'
	];
	for (const a of actions) {
		if (a.kind !== 'day' || !a.date) continue;
		const url = `${origin}/a/${a.slug}`;
		const by = a.called_by ? `Called by ${a.called_by}. ` : '';
		const desc = `${a.ask}\n\n${by}Your own day, wherever you live. Count yourself in, with no list of who: ${url}`;
		lines.push(
			'BEGIN:VEVENT',
			`UID:${a.slug}@nolistofwho.org`,
			`DTSTAMP:${dtstamp}`,
			`DTSTART;VALUE=DATE:${compact(a.date)}`,
			`DTEND;VALUE=DATE:${compact(addDays(a.date, a.days ?? 1))}`,
			...(a.repeat === 'weekly' ? [`RRULE:FREQ=WEEKLY${a.until ? `;UNTIL=${compact(a.until)}` : ''}`] : []),
			`SUMMARY:${icsText(a.title)}`,
			`DESCRIPTION:${icsText(desc)}`,
			`URL:${url}`,
			'TRANSP:TRANSPARENT',
			// A reminder at 9:00 the day before (15 hours before the day starts).
			'BEGIN:VALARM',
			'ACTION:DISPLAY',
			`DESCRIPTION:${icsText(`Tomorrow: ${a.title}`)}`,
			'TRIGGER:-PT15H',
			'END:VALARM',
			'END:VEVENT'
		);
	}
	lines.push('END:VCALENDAR');
	return lines.map(fold).join('\r\n') + '\r\n';
}
