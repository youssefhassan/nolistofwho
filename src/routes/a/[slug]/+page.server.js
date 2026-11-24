import { error } from '@sveltejs/kit';
import { counter, pause, today, now, batchSeconds } from '#lib/server/db.js';
import { currentRound, pastRounds, roundState } from '#lib/server/counter.js';

export function load({ params }) {
	const a = counter.getAction(params.slug);
	if (!a) error(404, 'No such action');
	const at = now();
	const r = currentRound(a, at);
	const { totals, removed } = counter.numbers();
	const state = a.kind === 'step' ? 'open' : r ? roundState(r, at) : 'past';
	// For a finished action, the last round stays on show as the result.
	const shown = r ?? (a.kind === 'step' ? null : a.repeat === 'weekly' ? null : { key: '', start: a.date, end: a.date });
	const c = counter.countOf(a.slug, shown?.key ?? '');
	const areaKey = shown?.key ? `${a.slug}@${shown.key}` : a.slug;
	const next = a.next ? counter.getAction(a.next) : null;
	return {
		action: { slug: a.slug, title: a.title, ask: a.ask, company: a.company, kind: a.kind, date: a.date, repeat: a.repeat, until: a.until, days: a.days, calledBy: a.called_by, calledByUrl: a.called_by_url },
		round: shown,
		state,
		in: c.in,
		did: c.did,
		history: pastRounds(a, at).map((start) => ({ start, ...counter.countOf(a.slug, start) })),
		totals: totals[a.slug] ?? {},
		removed: removed[a.slug] ?? 0,
		// The batch: the number shown is as of `asOf`, and moves next at `nextUpdate`.
		nextUpdate: counter.nextUpdate(),
		asOf: counter.nextUpdate() - batchSeconds * 1000,
		takenAt: counter.takenAt(),
		paused: !!pause.paused(),
		batchSeconds,
		areas: counter.areas(today())[areaKey] ?? [],
		next: next ? { slug: next.slug, title: next.title, date: currentRound(next, at)?.start ?? next.date, repeat: next.repeat } : null
	};
}
