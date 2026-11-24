import { counter, now } from '#lib/server/db.js';
import { COMPANIES, stateOf, currentRound } from '#lib/server/counter.js';

export function load() {
	const at = now();
	const actions = counter.listActions().map((a) => {
		const r = currentRound(a, at);
		const c = counter.countOf(a.slug, r?.key ?? '');
		return {
			slug: a.slug, title: a.title, company: a.company, kind: a.kind, repeat: a.repeat,
			date: r?.start ?? a.date, calledBy: a.called_by, state: stateOf(a, at),
			in: c.in, did: c.did
		};
	});
	return {
		groups: COMPANIES.map((c) => ({ ...c, actions: actions.filter((a) => a.company === c.id) }))
	};
}
