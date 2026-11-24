import { stage, pretending } from '#lib/server/db.js';

export function load() {
	return { stage, pretending };
}
