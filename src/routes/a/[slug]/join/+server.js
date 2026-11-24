// The only thing a person ever sends: a ticket, the solved puzzle, and an area and two numbers if they chose to.
// Nothing here is logged. The IP address is used only by the in-memory rate limit (see guard.js).
import { json } from '@sveltejs/kit';
import { counter, guard, pause, today, now } from '#lib/server/db.js';

export async function POST({ params, request, getClientAddress }) {
	if (pause.paused()) return json({ status: 'paused' }, { status: 503 });
	if (!guard.allow(getClientAddress())) return json({ status: 'slow_down' }, { status: 429 });
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ status: 'bad_request' }, { status: 400 });
	}
	if (!guard.checkPuzzle(body?.puzzle)) return json({ status: 'bad_puzzle' }, { status: 400 });
	const status = counter.join(params.slug, body?.ticket, {
		round: typeof body?.round === 'string' ? body.round : '',
		country: body?.country,
		city: body?.city,
		postalCode: body?.postalCode,
		sums: body?.sums && typeof body.sums === 'object' ? body.sums : undefined,
		today: today(),
		now: now()
	});
	if (status === 'counted') pause.counted();
	if (status === 'bad_ticket') return json({ status }, { status: 400 });
	if (status === 'unknown') return json({ status }, { status: 404 });
	// When the public number will include this ticket, so the person's own screen can show it already.
	// `at`: the server's own clock at this join, so the page can tell whether the public number already holds it.
	return json({ status, shownAt: counter.nextUpdate(), at: Date.now() });
}
