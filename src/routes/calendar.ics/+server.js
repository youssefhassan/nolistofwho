// The calendar feed. Calendar apps fetch it now and then; nothing about who fetches it is kept.
import { counter, stage } from '#lib/server/db.js';
import { calendar } from '#lib/calendar.js';

export function GET({ url }) {
	const body = calendar(counter.listActions(), { origin: url.origin, staging: stage === 'staging' });
	return new Response(body, {
		headers: {
			'content-type': 'text/calendar; charset=utf-8',
			'content-disposition': 'inline; filename="nolistofwho.ics"',
			'cache-control': 'public, max-age=3600'
		}
	});
}
