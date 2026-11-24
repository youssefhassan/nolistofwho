// A fresh puzzle for the browser to solve before it sends a ticket. Nothing about the asker is kept.
import { json } from '@sveltejs/kit';
import { guard } from '#lib/server/db.js';

export function GET() {
	return json(guard.puzzle(), { headers: { 'cache-control': 'no-store' } });
}
